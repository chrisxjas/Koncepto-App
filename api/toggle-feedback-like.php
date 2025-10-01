<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// Include DB connection
include __DIR__ . '/db_connection.php';

$data = json_decode(file_get_contents("php://input"), true);
$feedback_id = isset($data["feedback_id"]) ? intval($data["feedback_id"]) : 0;
$action = $data["action"] ?? '';

if (!$feedback_id || !in_array($action, ['like', 'unlike'])) {
    echo json_encode(["success" => false, "message" => "Missing or invalid feedback_id or action."]);
    exit();
}

// Use backticks for reserved keywords (`like`) and prepared statements
$sql = ($action === 'like') 
    ? "UPDATE feedbacks SET `like` = `like` + 1 WHERE id = ?" 
    : "UPDATE feedbacks SET `like` = GREATEST(`like` - 1, 0) WHERE id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $feedback_id);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo json_encode(["success" => true, "message" => "Action applied successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "No changes made."]);
}

$stmt->close();
$conn->close();
?>
