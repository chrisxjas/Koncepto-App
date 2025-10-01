<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

// Get POST data
$data = json_decode(file_get_contents("php://input"));
$id = isset($data->id) ? intval($data->id) : 0;

if (!$id) {
    echo json_encode(["success" => false, "message" => "Missing or invalid message ID"]);
    exit;
}

// Prepare and execute DELETE statement
$sql = "DELETE FROM messages WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Message deleted successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to delete message: " . $conn->error]);
}

$stmt->close();
$conn->close();
?>
