<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

// Get and validate user_id
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
if (!$user_id) {
    echo json_encode(["success" => false, "message" => "Missing user_id"]);
    exit;
}

// Use LEFT JOIN for feedbacks in case some orders have no feedback yet
$sql = "
SELECT 
    o.id AS order_id,
    o.Orderdate,
    o.status,
    p.id AS product_id,
    p.productName,
    p.image,
    od.quantity,
    od.price,
    f.star,
    f.feedback
FROM orders o
JOIN order_details od ON o.id = od.order_id
JOIN products p ON od.product_id = p.id
LEFT JOIN feedbacks f ON o.id = f.order_id AND p.id = f.product_id
WHERE o.user_id = ?
ORDER BY o.Orderdate DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];
while ($row = $result->fetch_assoc()) {
    $order_id = $row["order_id"];
    if (!isset($orders[$order_id])) {
        $orders[$order_id] = [
            "order_id" => $row["order_id"],
            "Orderdate" => $row["Orderdate"],
            "status" => $row["status"],
            "items" => [],
        ];
    }

    $orders[$order_id]["items"][] = [
        "product_id" => $row["product_id"],
        "productName" => $row["productName"],
        "quantity" => $row["quantity"],
        "price" => $row["price"],
        "image" => $row["image"],
        "star" => $row["star"] ?? null,
        "feedback" => $row["feedback"] ?? null,
    ];
}

$stmt->close();
$conn->close();

echo json_encode([
    "success" => true,
    "orders" => array_values($orders),
]);
