<?php
// Enable error reporting for development
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Set headers
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

// Parse incoming JSON
$data = json_decode(file_get_contents("php://input"), true);
$user_id = $data['user_id'] ?? null;
$selectedItems = $data['cart_item_ids'] ?? [];

if (!$user_id || empty($selectedItems)) {
    echo json_encode(["success" => false, "message" => "Missing required data"]);
    exit;
}

// Create order
$now = date("Y-m-d H:i:s");
$shipDate = date("Y-m-d H:i:s", strtotime("+3 days"));

$createOrderQuery = "
    INSERT INTO orders (user_id, Orderdate, Shipdate, status, created_at, updated_at)
    VALUES (?, ?, ?, 'to pay', ?, ?)
";
$stmt = $conn->prepare($createOrderQuery);
$stmt->bind_param("issss", $user_id, $now, $shipDate, $now, $now);

if (!$stmt->execute()) {
    echo json_encode(["success" => false, "message" => "Failed to create order"]);
    $stmt->close();
    $conn->close();
    exit;
}
$order_id = $stmt->insert_id;
$stmt->close();

// Process each selected cart item
foreach ($selectedItems as $cart_item_id) {
    $res = $conn->query("
        SELECT ci.*, p.price 
        FROM cart_items ci 
        JOIN products p ON ci.product_id = p.id 
        WHERE ci.id = '$cart_item_id'
    ");

    if ($res && $res->num_rows > 0) {
        $item = $res->fetch_assoc();
        $product_id = $item['product_id'];
        $quantity = $item['quantity'];
        $price = $item['price'];

        // Insert into order_detail
        $insertDetail = $conn->prepare("
            INSERT INTO order_details (order_id, product_id, quantity, price, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $insertDetail->bind_param("iiidss", $order_id, $product_id, $quantity, $price, $now, $now);
        $insertDetail->execute();
        $insertDetail->close();

        // Remove item from cart
        $conn->query("DELETE FROM cart_items WHERE id = '$cart_item_id'");
    }
}

// Clean up empty cart
$conn->query("
    DELETE FROM cart 
    WHERE user_id = '$user_id' 
    AND NOT EXISTS (
        SELECT 1 FROM cart_items WHERE cart_id = cart.id
    )
");

// Final JSON response
echo json_encode(["success" => true, "message" => "Checkout complete"]);
$conn->close();
?>
