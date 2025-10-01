<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

include __DIR__ . '/db_connection.php'; // ✅ Separate DB connection

$data = json_decode(file_get_contents("php://input"), true);
$sender_id = isset($data["sender_id"]) ? intval($data["sender_id"]) : 0;
$message = trim($data["message"] ?? '');

// Validation
if (!$sender_id || $message === '') {
    echo json_encode(["success" => false, "message" => "Missing sender or message"]);
    exit();
}

// Get admin ID
$admin_result = $conn->query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
$admin = $admin_result->fetch_assoc();
$receiver_id = $admin['id'] ?? 0;

if (!$receiver_id) {
    echo json_encode(["success" => false, "message" => "No admin found"]);
    exit();
}

// Insert message
$stmt = $conn->prepare("INSERT INTO messages (sender_id, receiver_id, message, is_read, created_at, updated_at) VALUES (?, ?, ?, 0, NOW(), NOW())");
$stmt->bind_param("iis", $sender_id, $receiver_id, $message);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Message sent successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to send message: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
