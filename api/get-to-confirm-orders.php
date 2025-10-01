<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

include __DIR__ . '/db_connection.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
if ($user_id === 0) {
    echo json_encode(["success" => false, "message" => "Invalid user_id"]);
    exit();
}

// Step 1: Fetch orders with status 'To Confirm'
$order_sql = "SELECT id AS order_id, Orderdate, status 
              FROM orders 
              WHERE user_id = ? AND status = 'To Confirm' 
              ORDER BY Orderdate DESC";

$stmt_order = $conn->prepare($order_sql);
$stmt_order->bind_param("i", $user_id);
$stmt_order->execute();
$order_result = $stmt_order->get_result();

$orders = [];

while ($order = $order_result->fetch_assoc()) {
    $order_id = $order['order_id'];

    // Step 2: Fetch items for this order
    $items_sql = "SELECT 
                    p.id AS product_id,
                    p.productName, 
                    od.quantity, 
                    od.price, 
                    p.image
                  FROM order_details od
                  JOIN products p ON od.product_id = p.id
                  WHERE od.order_id = ?";

    $stmt_items = $conn->prepare($items_sql);
    $stmt_items->bind_param("i", $order_id);
    $stmt_items->execute();
    $items_result = $stmt_items->get_result();

    $items = [];
    while ($item = $items_result->fetch_assoc()) {
        $items[] = $item;
    }

    $order['items'] = $items;
    $orders[] = $order;

    $stmt_items->close();
}

$stmt_order->close();

echo json_encode([
    "success" => true,
    "orders" => $orders
]);

$conn->close();
?>
