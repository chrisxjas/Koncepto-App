<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

include __DIR__ . '/db_connection.php'; // include DB connection

$user_id = $_GET['id'] ?? null;

if (!$user_id) {
    echo json_encode(["success" => false, "message" => "Missing user_id"]);
    exit;
}

$query = $conn->prepare("
    SELECT 
        u.id, u.first_name, u.last_name, u.email, u.cp_no, 
        u.role, u.profilepic
    FROM users u 
    WHERE u.id = ?
");
$query->bind_param("i", $user_id);
$query->execute();
$result = $query->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    echo json_encode(["success" => true, "user" => $user]);
} else {
    echo json_encode(["success" => false, "message" => "User not found"]);
}

$conn->close();
?>
