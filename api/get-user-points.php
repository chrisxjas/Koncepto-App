<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

include __DIR__ . '/db_connection.php'; // include the separate DB connection

if (!isset($_GET['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit;
}

$user_id = intval($_GET['user_id']);

try {
    // 1️⃣ Get total points from user_total_points view
    $stmt = $conn->prepare("SELECT total_points FROM user_total_points WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $total_points = $result->fetch_assoc()['total_points'] ?? 0;
    $stmt->close();

    // 2️⃣ Get earned points per product from order_points_summary view
    $stmt = $conn->prepare("
        SELECT order_id, Orderdate AS order_date, productName AS product_name, quantity, total_points
        FROM order_points_summary
        WHERE user_id = ?
        ORDER BY order_date DESC
    ");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $earned_points = [];
    while ($row = $result->fetch_assoc()) {
        $earned_points[] = [
            'transaction_id' => $row['order_id'],
            'product_name' => $row['product_name'],
            'quantity' => intval($row['quantity']),
            'points_earned' => floatval($row['total_points']),
            'order_date' => $row['order_date'],
        ];
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'balance' => floatval($total_points),
        'earned_points' => $earned_points
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
