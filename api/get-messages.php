<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

$user_id = isset($_GET["user_id"]) ? intval($_GET["user_id"]) : null;
if (!$user_id) {
    echo json_encode(["success" => false, "message" => "Missing user_id"]);
    exit;
}

// Get admin ID
$admin_stmt = $conn->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
$admin_stmt->execute();
$admin_result = $admin_stmt->get_result();
$admin = $admin_result->fetch_assoc();
$admin_id = $admin['id'] ?? null;
$admin_stmt->close();

if (!$admin_id) {
    echo json_encode(["success" => false, "message" => "No admin found"]);
    exit;
}

// Get messages between user and admin
$sql = "
    SELECT id, sender_id, message, created_at
    FROM messages
    WHERE (sender_id = ? AND receiver_id = ?)
       OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
";
$stmt = $conn->prepare($sql);
$stmt->bind_param("iiii", $user_id, $admin_id, $admin_id, $user_id);
$stmt->execute();
$result = $stmt->get_result();

$messages = [];
while ($row = $result->fetch_assoc()) {
    $messages[] = [
        'id' => $row['id'],
        'sender' => $row['sender_id'] == $user_id ? 'You' : 'Admin',
        'message' => $row['message'],
        'time' => date('h:i A', strtotime($row['created_at'])),
        'type' => $row['sender_id'] == $user_id ? 'sent' : 'received'
    ];
}

echo json_encode(["success" => true, "messages" => $messages]);

$stmt->close();
$conn->close();
?>
