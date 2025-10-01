<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Include the database connection
include __DIR__ . '/db_connection.php';

$response = ['success' => false, 'message' => '', 'rewards' => []];

$sql = "SELECT id, reward_name, required_points, description, image, stock, status 
        FROM rewards 
        WHERE status = 'active' 
        ORDER BY required_points ASC";

$result = $conn->query($sql);

if ($result) {
    $rewards = [];
    while ($row = $result->fetch_assoc()) {
        $rewards[] = $row;
    }
    $response['success'] = true;
    $response['message'] = "Rewards fetched successfully.";
    $response['rewards'] = $rewards;
} else {
    $response['message'] = "Failed to fetch rewards: " . $conn->error;
}

echo json_encode($response);
$conn->close();
?>
