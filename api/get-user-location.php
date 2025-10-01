<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

include __DIR__ . '/db_connection.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit;
}

// Get user's location
$stmt = $conn->prepare("
    SELECT ul.id, ul.address, ul.latitude, ul.longitude
    FROM users u
    LEFT JOIN user_location ul ON u.location_id = ul.id
    WHERE u.id = ?
");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $location = $result->fetch_assoc();
    echo json_encode(['success' => true, 'user' => $location]);
} else {
    echo json_encode(['success' => true, 'user' => null]); // no location yet
}
?>
