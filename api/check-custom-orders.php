<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

include __DIR__ . '/db_connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['user_id']) || empty($data['items'])) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request. Missing user_id or items."
    ]);
    exit();
}

$user_id = intval($data['user_id']);
$items = $data['items'];

try {
    $conn->begin_transaction();

    // Insert into custom_orders
    $stmt = $conn->prepare("INSERT INTO custom_orders (user_id, status, created_at, updated_at) VALUES (?, 'pending', NOW(), NOW())");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $custom_order_id = $stmt->insert_id;
    $stmt->close();

    // Insert items
    $stmt = $conn->prepare("INSERT INTO custom_order_items (custom_order_id, name, brand, unit, quantity, photo, description, created_at, updated_at, gathered) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)");

    foreach ($items as $item) {
        $name = $item['name'] ?? '';
        $brand = $item['brand'] ?? '';
        $unit = $item['unit'] ?? '';
        $quantity = intval($item['quantity']);
        $photo = $item['photo'] ?? null;
        $description = $item['description'] ?? '';
        $gathered = isset($item['gathered']) ? intval($item['gathered']) : 0;

        $stmt->bind_param("isssissi", $custom_order_id, $name, $brand, $unit, $quantity, $photo, $description, $gathered);
        $stmt->execute();
    }
    $stmt->close();

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Custom order submitted successfully.",
        "custom_order_id" => $custom_order_id
    ]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode([
        "success" => false,
        "message" => "Error submitting order: " . $e->getMessage()
    ]);
} finally {
    $conn->close();
}
?>
