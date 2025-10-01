<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// include db connection (same folder: api/)
include __DIR__ . '/db_connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['order_id'], $data['product_id'])) {
    echo json_encode(["success" => false, "message" => "Missing order_id or product_id"]);
    exit();
}

$order_id = intval($data['order_id']);
$product_id = intval($data['product_id']);

$sql = "DELETE FROM order_details WHERE order_id = ? AND product_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $order_id, $product_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Order item deleted successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to delete order item"]);
}

$stmt->close();
$conn->close();
?>
