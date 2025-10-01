<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

// Get user_id from GET request
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if ($user_id === 0) {
    echo json_encode(['success' => false, 'message' => 'User ID is required.']);
    exit();
}

// Calculate date 6 months ago
$sixMonthsAgo = date('Y-m-d H:i:s', strtotime('-6 months'));

// SQL query to get top 3 frequently purchased items in the last 6 months
$sql = "
    SELECT
        p.id AS product_id_actual,
        p.productName AS name,
        p.price,
        p.image,
        COUNT(od.product_id) AS purchase_count
    FROM orders o
    JOIN order_details od ON o.id = od.order_id
    JOIN products p ON od.product_id = p.id
    WHERE o.user_id = ? AND o.Orderdate >= ?
    GROUP BY p.id, p.productName, p.price, p.image
    ORDER BY purchase_count DESC
    LIMIT 3
";

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    echo json_encode(['success' => false, 'message' => 'Failed to prepare statement: ' . $conn->error]);
    $conn->close();
    exit();
}

$stmt->bind_param("is", $user_id, $sixMonthsAgo);
$stmt->execute();
$result = $stmt->get_result();

$items = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = 'fp_' . $row['product_id_actual']; // unique key for frontend
    $items[] = $row;
}

echo json_encode(['success' => true, 'items' => $items]);

$stmt->close();
$conn->close();
?>
