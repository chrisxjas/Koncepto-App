<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

$response = array();

// Check if user_id is provided
if (isset($_GET['user_id'])) {
    $userId = intval($_GET['user_id']);

    $stmt = $conn->prepare("SELECT email FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $response['success'] = true;
        $response['email'] = $user['email'];
        $response['message'] = "Account options fetched successfully.";
    } else {
        $response['success'] = false;
        $response['message'] = "User not found.";
    }

    $stmt->close();
} else {
    $response['success'] = false;
    $response['message'] = "User ID not provided.";
}

$conn->close();
echo json_encode($response);
?>
