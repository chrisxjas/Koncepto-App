<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

if (!$user_id) {
    echo json_encode(["success" => false, "message" => "Missing user_id"]);
    exit;
}

// Get cart ID for the user
$cartRes = $conn->query("SELECT id FROM carts WHERE user_id = $user_id");
if ($cartRes->num_rows === 0) {
    echo json_encode(["success" => true, "items" => []]);
    exit;
}

$cart = $cartRes->fetch_assoc();
$cart_id = $cart['id'];

// Fetch cart items with product details
$sql = "
    SELECT 
        ci.id,
        ci.quantity,
        p.id AS product_id,
        p.productName,
        p.price,
        p.image,
        ci.created_at
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.cart_id = $cart_id
    ORDER BY ci.created_at DESC, ci.id DESC
";

$result = $conn->query($sql);
$items = [];

while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

echo json_encode(["success" => true, "items" => $items]);
$conn->close();

?>