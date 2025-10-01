<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

include __DIR__ . '/db_connection.php'; // ✅ use separate DB connection

$data = json_decode(file_get_contents('php://input'), true);

$user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;
$order_id = isset($data['order_id']) ? intval($data['order_id']) : 0;
$product_id = isset($data['product_id']) ? intval($data['product_id']) : 0;
$feedback = trim($data['feedback'] ?? '');
$star = isset($data['star']) ? intval($data['star']) : 0;

// Validation
if (!$user_id || !$order_id || !$product_id || $feedback === '' || $star <= 0 || $star > 5) {
    echo json_encode(["success" => false, "message" => "Missing or invalid required fields."]);
    exit();
}

// Insert or update feedback
$sql = "INSERT INTO feedbacks (user_id, order_id, product_id, feedback, star, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE feedback = VALUES(feedback), star = VALUES(star), updated_at = NOW()";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iiisi", $user_id, $order_id, $product_id, $feedback, $star);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Feedback saved successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to save feedback: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
