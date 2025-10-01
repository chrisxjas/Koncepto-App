<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Include database connection
include __DIR__ . '/db_connection.php';
if (!$conn) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    http_response_code(500);
    exit();
}

// Get POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validate user_id
if (!isset($data['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'User ID is required.']);
    http_response_code(400);
    exit();
}

$userId = intval($data['user_id']);
if ($userId <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid user ID.']);
    http_response_code(400);
    exit();
}

try {
    // Fetch payments for the user
    $sql = "
        SELECT
            p.id AS payment_id,
            p.order_id,
            p.order_type,
            p.payment_method,
            p.payment_proof,
            p.status AS payment_status,
            p.payment_date,
            o.Orderdate,
            o.Shipdate,
            o.status AS order_status,
            u.first_name,
            u.last_name,
            u.email
        FROM payments p
        LEFT JOIN orders o ON p.order_id = o.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $conn->error);
    }

    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $receipts = [];

    while ($row = $result->fetch_assoc()) {
        // Fetch items for each order
        $items = [];
        if (!empty($row['order_id'])) {
            $stmtItems = $conn->prepare("
                SELECT od.product_id, p.productName, od.quantity, od.price
                FROM order_details od
                JOIN products p ON od.product_id = p.id
                WHERE od.order_id = ?
            ");
            if ($stmtItems) {
                $stmtItems->bind_param("i", $row['order_id']);
                $stmtItems->execute();
                $itemsResult = $stmtItems->get_result();
                while ($item = $itemsResult->fetch_assoc()) {
                    $items[] = $item;
                }
                $stmtItems->close();
            }
        }

        $row['items'] = $items;
        $receipts[] = $row;
    }

    $stmt->close();
    $conn->close();

    echo json_encode(['status' => 'success', 'data' => $receipts]);

} catch (Exception $e) {
    error_log("Error in get-receipt.php: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
    http_response_code(500);
}
?>
