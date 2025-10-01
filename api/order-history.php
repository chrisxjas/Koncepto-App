<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// Enable error reporting for debugging (remove in production)
ini_set('display_errors', 1);
error_reporting(E_ALL);

include __DIR__ . '/db_connection.php';

$user_id = $_GET["user_id"] ?? null;

if (!$user_id) {
    echo json_encode(["success" => false, "message" => "Missing user_id"]);
    exit;
}

// Only fetch orders with status = 'order success'
$sql = "
    SELECT 
        orders.id AS order_id,
        orders.Orderdate AS order_date,
        products.productName,
        products.brandName,
        products.image,
        products.description,
        products.id AS product_id,
        SUM(order_details.quantity * order_details.price) AS total_price
    FROM orders
    JOIN order_details ON orders.id = order_details.order_id
    JOIN products ON order_details.product_id = products.id
    WHERE orders.user_id = ? AND orders.status = 'order success'
    GROUP BY orders.id, products.id
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "SQL prepare failed: " . $conn->error]);
    exit;
}

$stmt->bind_param("i", $user_id);

if (!$stmt->execute()) {
    echo json_encode(["success" => false, "message" => "SQL execute failed: " . $stmt->error]);
    exit;
}

$result = $stmt->get_result();

$orders = [];
while ($row = $result->fetch_assoc()) {
    $orders[] = [
        "id" => $row["order_id"],
        "date" => $row["order_date"],
        "productName" => $row["productName"],
        "brandName" => $row["brandName"],
        "image" => $row["image"],
        "description" => $row["description"],
        "product_id" => $row["product_id"],
        "total_price" => $row["total_price"],
    ];
}

echo json_encode(["success" => true, "orders" => $orders]);

$stmt->close();
$conn->close();
?>
