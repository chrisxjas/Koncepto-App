<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST, OPTIONS'); 
header('Access-Control-Allow-Headers: Content-Type'); 

// Enable error reporting for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

// Handle preflight OPTIONS request (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get POST data from the request body
$input = json_decode(file_get_contents('php://input'), true);

// Validate received data
$userId = isset($input['userId']) ? intval($input['userId']) : null;
$categoryId = isset($input['categoryId']) ? intval($input['categoryId']) : null;
$items = isset($input['items']) ? $input['items'] : [];

if (!$userId || !$categoryId || !is_array($items) || count($items) === 0) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields (userId, categoryId, or items array is empty).']);
    exit;
}

$now = date('Y-m-d H:i:s'); 

// Start transaction
$conn->begin_transaction();

try {
    // Insert into custom_order
    $stmtOrder = $conn->prepare("
        INSERT INTO custom_orders (user_id, created_at, updated_at)
        VALUES (?, ?, ?)
    ");
    $stmtOrder->bind_param("iss", $userId, $now, $now);

    if (!$stmtOrder->execute()) {
        throw new Exception('Failed to insert into custom_orders: ' . $stmtOrder->error);
    }
    $customOrderId = $stmtOrder->insert_id;
    $stmtOrder->close();

    // Insert each item into custom_order_items
    $stmtItem = $conn->prepare("
        INSERT INTO custom_order_items
        (custom_order_id, category_id, name, brand, unit, quantity, price, photo, description, gathered)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    foreach ($items as $it) {
        $itemCategoryId = $categoryId; 
        $name = $conn->real_escape_string($it['name'] ?? '');
        $brand = $conn->real_escape_string($it['brand'] ?? null);
        $unit = $conn->real_escape_string($it['unit'] ?? null);
        $quantity = intval($it['quantity'] ?? 0);
        $price = isset($it['price']) ? floatval($it['price']) : 0.00;
        $photo = $conn->real_escape_string($it['photo'] ?? null);
        $description = $conn->real_escape_string($it['description'] ?? null);
        $gathered = isset($it['gathered']) ? intval($it['gathered']) : 0;

        $stmtItem->bind_param(
            "iisssidssi",
            $customOrderId,
            $itemCategoryId,
            $name,
            $brand,
            $unit,
            $quantity,
            $price,
            $photo,
            $description,
            $gathered
        );

        if (!$stmtItem->execute()) {
            throw new Exception('Failed to insert item "' . $name . '": ' . $stmtItem->error);
        }
    }
    $stmtItem->close();

    $conn->commit();
    echo json_encode(['success' => true, 'custom_order_id' => $customOrderId, 'message' => 'Order submitted successfully.']);

} catch (Exception $e) {
    $conn->rollback();
    error_log("Custom Order Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Transaction failed: ' . $e->getMessage()]);
} finally {
    $conn->close();
}
?>
