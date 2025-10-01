<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include __DIR__ . '/db_connection.php';

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['user_id']) || !is_numeric($data['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User ID is required.']);
    exit;
}

$userId = intval($data['user_id']);

try {
    // Fetch custom orders for the user
    $stmtOrders = $conn->prepare("
        SELECT 
            id AS order_id, 
            user_id, 
            status,
            driver_latitude,
            driver_longitude,
            created_at AS order_created_at, 
            updated_at AS order_updated_at
        FROM custom_orders
        WHERE user_id = ?
        ORDER BY created_at DESC
    ");
    $stmtOrders->bind_param("i", $userId);
    $stmtOrders->execute();
    $ordersResult = $stmtOrders->get_result();
    $stmtOrders->close();

    $customOrders = [];

    while ($order = $ordersResult->fetch_assoc()) {
        // Fetch items for each custom order
        $stmtItems = $conn->prepare("
            SELECT 
                ci.id AS item_id, 
                ci.name AS item_name, 
                ci.brand, 
                ci.unit, 
                ci.quantity, 
                ci.price, 
                ci.total_price, 
                ci.photo, 
                ci.description, 
                ci.created_at AS item_created_at,
                ci.updated_at AS item_updated_at,
                ci.gathered
            FROM custom_order_items ci
            WHERE ci.custom_order_id = ?
            ORDER BY ci.id ASC
        ");
        $stmtItems->bind_param("i", $order['order_id']);
        $stmtItems->execute();
        $itemsResult = $stmtItems->get_result();
        $order['items'] = $itemsResult->fetch_all(MYSQLI_ASSOC);
        $stmtItems->close();

        $customOrders[] = $order;
    }

    echo json_encode([
        'success' => true,
        'has_orders' => count($customOrders) > 0,
        'orders' => $customOrders
    ]);

} catch (Exception $e) {
    error_log("Error in get-custom-orders.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'An error occurred while retrieving custom orders.'
    ]);
}

$conn->close();
?>
