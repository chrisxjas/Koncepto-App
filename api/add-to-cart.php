<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// include db connection (same folder: api/)
include __DIR__ . '/db_connection.php';

$data = json_decode(file_get_contents("php://input"), true);

$user_id = (int) ($data['user_id'] ?? 0);
$product_id = (int) ($data['product_id'] ?? 0);
$quantity = (int) ($data['quantity'] ?? 1);
$replace = isset($data['replace']) ? (bool) $data['replace'] : false;

if (!$user_id || !$product_id) {
    echo json_encode(["success" => false, "message" => "Missing user_id or product_id"]);
    exit;
}

// check if cart exists
$cartRes = $conn->query("SELECT id FROM carts WHERE user_id = $user_id");
if ($cartRes->num_rows > 0) {
    $cart = $cartRes->fetch_assoc();
    $cart_id = $cart['id'];
} else {
    $conn->query("INSERT INTO carts (user_id, created_at) VALUES ($user_id, NOW())");
    $cart_id = $conn->insert_id;
}

// check if product exists in cart
$checkItem = $conn->query("SELECT id, quantity FROM cart_items WHERE cart_id = $cart_id AND product_id = $product_id");

if ($checkItem->num_rows > 0) {
    $item = $checkItem->fetch_assoc();
    $newQuantity = $replace ? $quantity : ($item['quantity'] + $quantity);
    $conn->query("UPDATE cart_items SET quantity = $newQuantity WHERE id = {$item['id']}");
} else {
    $conn->query("INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($cart_id, $product_id, $quantity)");
}

echo json_encode(["success" => true, "message" => "Cart updated successfully"]);
$conn->close();
?>
