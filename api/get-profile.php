<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

// Get and validate user_id
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'Missing user_id']);
    exit;
}

$sql = "
    SELECT 
        users.first_name,
        users.last_name,
        users.email,
        users.cp_no,
        users.role,
        users.profilepic,
        users.created_at
    FROM users
    WHERE users.id = ?
";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    $stmt->close();
    $conn->close();
    exit;
}

$user = $result->fetch_assoc();
$stmt->close();

// Get order counts for the user
$orderSql = "
    SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'to rate' THEN 1 ELSE 0 END) AS to_rate
    FROM orders
    WHERE user_id = ?
";
$orderStmt = $conn->prepare($orderSql);
$orderStmt->bind_param('i', $user_id);
$orderStmt->execute();
$orderResult = $orderStmt->get_result()->fetch_assoc();
$orderStmt->close();

$user['orders'] = $orderResult;

echo json_encode(['success' => true, 'user' => $user]);

$conn->close();
?>