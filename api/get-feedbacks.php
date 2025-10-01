<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

include __DIR__ . '/db_connection.php';

$product_id = isset($_GET['product_id']) ? $_GET['product_id'] : null;

if (!$product_id) {
    echo json_encode(["success" => false, "message" => "Missing product_id"]);
    exit;
}

$sql = "
    SELECT f.id, f.star, f.feedback, f.`like`, f.created_at, CONCAT(u.first_name, ' ', u.last_name) AS user_name
    FROM feedbacks f
    JOIN users u ON u.id = f.user_id
    WHERE f.product_id = ?
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $product_id);
$stmt->execute();
$result = $stmt->get_result();

$feedbacks = [];
while ($row = $result->fetch_assoc()) {
    $row['user_liked_this_feedback'] = false; // default value
    $feedbacks[] = $row;
}

echo json_encode([
    "success" => true,
    "data" => $feedbacks
]);

$stmt->close();
$conn->close();
?>
