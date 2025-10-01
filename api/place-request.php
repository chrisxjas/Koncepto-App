<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

ini_set('display_errors', 1);
error_reporting(E_ALL);

include __DIR__ . '/db_connection.php'; // ✅ separate DB connection

$response = [];

try {
    $data = $_POST;

    if (
        !isset($data['user_id']) ||
        !isset($data['order_date']) ||
        !isset($data['ship_date']) ||
        !isset($data['payment_method']) ||
        !isset($data['total_price'])
    ) {
        throw new Exception('Missing required fields.');
    }

    $userId = $data['user_id'];
    $orderDate = $data['order_date'];
    $shipDate = $data['ship_date'];
    $paymentMethod = $data['payment_method'];
    $totalPrice = $data['total_price'];
    $status = ($paymentMethod === 'GCash') ? 'to confirm' : 'to pay';
    $selectedItems = isset($data['items']) ? json_decode($data['items'], true) : [];

    $conn->begin_transaction();

    // 1️⃣ Insert Order
    $orderSql = "INSERT INTO orders (user_id, Orderdate, Shipdate, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, NOW(), NOW())";
    $orderStmt = $conn->prepare($orderSql);
    $orderStmt->bind_param("isss", $userId, $orderDate, $shipDate, $status);
    $orderStmt->execute();
    $orderId = $orderStmt->insert_id;

    // 2️⃣ Insert Order Details
    if (!empty($selectedItems)) {
        foreach ($selectedItems as $item) {
            $detailSql = "INSERT INTO order_details (order_id, product_id, quantity, price, created_at, updated_at)
                          VALUES (?, ?, ?, ?, NOW(), NOW())";
            $detailStmt = $conn->prepare($detailSql);
            $detailStmt->bind_param(
                "iiid",
                $orderId,
                $item['product_id'],
                $item['quantity'],
                $item['price']
            );
            $detailStmt->execute();
        }
    }

    // 3️⃣ Handle Cart Cleanup (optional)
    $cartSql = "SELECT id FROM carts WHERE user_id = ?";
    $cartStmt = $conn->prepare($cartSql);
    $cartStmt->bind_param("i", $userId);
    $cartStmt->execute();
    $cartResult = $cartStmt->get_result();
    $cartRow = $cartResult->fetch_assoc();
    $cartId = $cartRow['id'] ?? null;

    if ($cartId) {
        foreach ($selectedItems as $item) {
            $deleteItemSql = "DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?";
            $deleteItemStmt = $conn->prepare($deleteItemSql);
            $deleteItemStmt->bind_param("ii", $cartId, $item['product_id']);
            $deleteItemStmt->execute();
        }

        // Delete cart if empty
        $checkEmptySql = "SELECT 1 FROM cart_items WHERE cart_id = ?";
        $checkEmptyStmt = $conn->prepare($checkEmptySql);
        $checkEmptyStmt->bind_param("i", $cartId);
        $checkEmptyStmt->execute();
        $checkEmptyResult = $checkEmptyStmt->get_result();
        if ($checkEmptyResult->num_rows === 0) {
            $deleteCartSql = "DELETE FROM carts WHERE id = ?";
            $deleteCartStmt = $conn->prepare($deleteCartSql);
            $deleteCartStmt->bind_param("i", $cartId);
            $deleteCartStmt->execute();
        }
    }

    // 4️⃣ GCash payment proof
    if ($paymentMethod === 'GCash' && isset($_FILES["payment_proof"])) {
        $targetDir = "../assets/payment_proof/";
        if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);
        $fileName = uniqid() . "_" . basename($_FILES["payment_proof"]["name"]);
        move_uploaded_file($_FILES["payment_proof"]["tmp_name"], $targetDir . $fileName);
        $paymentProofPath = "assets/payment_proof/" . $fileName;

        $paymentSql = "INSERT INTO payments (order_id, payment_method, payment_proof, created_at, updated_at)
                       VALUES (?, ?, ?, NOW(), NOW())";
        $paymentStmt = $conn->prepare($paymentSql);
        $paymentStmt->bind_param("iss", $orderId, $paymentMethod, $paymentProofPath);
        $paymentStmt->execute();
    }

    $conn->commit();

    $response = [
        "success" => true,
        "message" => "Order placed successfully",
        "screen" => ($paymentMethod === 'GCash') ? "to-confirm" : "to-pay"
    ];
} catch (Exception $e) {
    $conn->rollback();
    $response = ["success" => false, "message" => $e->getMessage()];
}

echo json_encode($response);

$conn->close();
?>
