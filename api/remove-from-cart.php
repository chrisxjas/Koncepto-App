<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

include __DIR__ . '/db_connection.php'; // ✅ separate DB connection

$data = json_decode(file_get_contents("php://input"), true);
$cart_item_id = isset($data['cart_item_id']) ? intval($data['cart_item_id']) : 0;

if (!$cart_item_id) {
    echo json_encode(["success" => false, "message" => "Missing cart_item_id"]);
    exit();
}

// Get the cart_id of the item
$stmt = $conn->prepare("SELECT cart_id FROM cart_items WHERE id = ?");
$stmt->bind_param("i", $cart_item_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Cart item not found"]);
    $stmt->close();
    exit();
}

$cart_id = $result->fetch_assoc()['cart_id'];
$stmt->close();

// Delete the cart item
$delStmt = $conn->prepare("DELETE FROM cart_items WHERE id = ?");
$delStmt->bind_param("i", $cart_item_id);
$delStmt->execute();
$delStmt->close();

// Delete the cart if empty
$checkCartStmt = $conn->prepare("DELETE FROM carts WHERE id = ? AND NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = ?)");
$checkCartStmt->bind_param("ii", $cart_id, $cart_id);
$checkCartStmt->execute();
$checkCartStmt->close();

echo json_encode(["success" => true, "message" => "Item removed from cart"]);

$conn->close();
?>
