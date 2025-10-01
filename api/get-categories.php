<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

$sql = "SELECT id, categoryName FROM categories";
$result = $conn->query($sql);

$categories = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $categories[] = $row;
    }
}

echo json_encode(["success" => true, "categories" => $categories]);
$conn->close();
?>
