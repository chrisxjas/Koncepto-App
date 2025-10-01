<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

include __DIR__ . '/db_connection.php';

// Get top 2 overall products (most purchased across all users)
$sql = "
    SELECT 
        p.id AS product_id_actual,
        p.productName AS name,
        p.price,
        p.image,
        COUNT(od.product_id) AS total_purchase_count
    FROM order_details od
    JOIN products p ON od.product_id = p.id
    JOIN orders o ON od.order_id = o.id
    GROUP BY p.id, p.productName, p.price, p.image
    ORDER BY total_purchase_count DESC
    LIMIT 2
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
    $conn->close();
    exit();
}

$items = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = 'sp_' . $row['product_id_actual']; // unique key for frontend
    $items[] = $row;
}

$conn->close();

echo json_encode(['success' => true, 'items' => $items]);
?>
