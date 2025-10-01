<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

include __DIR__ . '/db_connection.php';

$user_id = $_GET['user_id'] ?? null;
if (!$user_id) {
    echo json_encode(["success" => false, "message" => "Missing user_id"]);
    exit;
}

$sql = "
    SELECT 
        p.id, 
        p.productName AS name, 
        p.price, 
        COUNT(od.product_id) AS order_count
    FROM orders o
    INNER JOIN order_details od ON o.id = od.order_id
    INNER JOIN products p ON p.id = od.product_id
    WHERE o.user_id = ?
    GROUP BY p.id
    ORDER BY order_count DESC
    LIMIT 2
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$recommended = [];
while ($row = $result->fetch_assoc()) {
    $recommended[] = [
        "id" => $row["id"],
        "name" => $row["name"],
        "price" => number_format($row["price"], 2),
    ];
}

echo json_encode(["success" => true, "recommended" => $recommended]);
$conn->close();
?>
