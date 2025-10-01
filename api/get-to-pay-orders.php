<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

include __DIR__ . '/db_connection.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
if ($user_id === 0) {
    echo json_encode(["success" => false, "message" => "Invalid user_id"]);
    exit();
}

// Fetch orders and their items in one query
$sql = "
    SELECT 
        o.id AS order_id,
        o.Orderdate,
        o.status,
        p.id AS product_id,
        p.productName,
        od.quantity,
        od.price,
        p.image
    FROM orders o
    JOIN order_details od ON o.id = od.order_id
    JOIN products p ON od.product_id = p.id
    WHERE o.user_id = ? AND o.status = 'To Pay'
    ORDER BY o.Orderdate DESC, od.id ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];

while ($row = $result->fetch_assoc()) {
    $order_id = $row['order_id'];
    if (!isset($orders[$order_id])) {
        $orders[$order_id] = [
            "order_id" => $order_id,
            "Orderdate" => $row['Orderdate'],
            "status" => $row['status'],
            "items" => [],
            "total_price" => 0
        ];
    }

    $item_subtotal = floatval($row['price']) * intval($row['quantity']);
    $orders[$order_id]['items'][] = array_merge($row, [
        "subtotal" => number_format($item_subtotal, 2, '.', '')
    ]);

    $orders[$order_id]['total_price'] += $item_subtotal;
}

// Format total_price for each order
foreach ($orders as &$order) {
    $order['total_price'] = number_format($order['total_price'], 2, '.', '');
}

echo json_encode([
    "success" => true,
    "orders" => array_values($orders)
]);

$stmt->close();
$conn->close();
?>
