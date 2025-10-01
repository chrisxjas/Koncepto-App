<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

// Fetch all products
$sql = "SELECT id, productName, brandName, description, price, image, category_id FROM products";
$result = $conn->query($sql);

$products = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
}

// Always return success true, even if no products
echo json_encode(["success" => true, "products" => $products]);

$conn->close();
?>
