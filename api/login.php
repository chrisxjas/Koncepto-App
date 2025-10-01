<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

include __DIR__ . '/db_connection.php'; // Include DB connection

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

if (empty($email) || empty($password)) {
    echo json_encode(["success" => false, "message" => "Missing email or password"]);
    exit();
}

$stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();
    $storedPassword = $user['password'];

    // If using password_hash() in the DB, replace the following line with:
    // if (password_verify($password, $storedPassword)) { ... }
    if ($password === $storedPassword) {
        echo json_encode([
            "success" => true,
            "user" => [
                "id" => $user["id"],
                "first_name" => $user["first_name"],
                "last_name" => $user["last_name"],
                "email" => $user["email"],
                "role" => $user["role"],
                "date_joined" => $user["created_at"]
            ]
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Incorrect password"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Email not found"]);
}

$stmt->close();
$conn->close();
?>
