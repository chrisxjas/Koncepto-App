<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

include __DIR__ . '/db_connection.php'; // Separate DB connection file

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if ($user_id === 0) {
    echo json_encode(["success" => false, "message" => "Invalid user_id"]);
    exit();
}

// Fetch orders with items that haven't been rated yet
$sql = "
    SELECT 
        o.id AS order_id,
        o.Orderdate,
        o.status,
        p.id AS product_id,
        p.productName,
        p.image,
        od.quantity,
        od.price
    FROM orders o
    JOIN order_details od ON o.id = od.order_id
    JOIN products p ON od.product_id = p.id
    WHERE o.user_id = ?
      AND o.status = 'To Rate'
      AND NOT EXISTS (
          SELECT 1 
          FROM feedbacks f 
          WHERE f.order_id = o.id 
            AND f.product_id = p.id 
            AND f.user_id = ?
      )
    ORDER BY o.Orderdate DESC, od.id ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $user_id, $user_id);
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
            "items" => []
        ];
    }

    $orders[$order_id]['items'][] = [
        "product_id" => $row['product_id'],
        "productName" => $row['productName'],
        "image" => $row['image'],
        "quantity" => $row['quantity'],
        "price" => number_format($row['price'], 2, '.', '')
    ];
}

echo json_encode([
    "success" => true,
    "orders" => array_values($orders)
]);

$stmt->close();
$conn->close();
?>
