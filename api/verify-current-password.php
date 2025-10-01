<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// include db connection (same folder: api/)
include __DIR__ . '/db_connection.php';

try {
    // fetch all users
    $result = $conn->query("SELECT id, password FROM users");
    if (!$result) {
        throw new Exception("Database error: " . $conn->error);
    }

    $updated = 0;
    while ($row = $result->fetch_assoc()) {
        $userId = $row['id'];
        $currentPassword = $row['password'];

        // skip if already hashed (assuming hashed passwords start with $2y$ for bcrypt)
        if (strpos($currentPassword, '$2y$') === 0) continue;

        $hashedPassword = password_hash($currentPassword, PASSWORD_DEFAULT);

        $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->bind_param("si", $hashedPassword, $userId);
        if ($stmt->execute()) $updated++;
        $stmt->close();
    }

    echo json_encode([
        "success" => true,
        "message" => "Password hashing completed",
        "users_updated" => $updated
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?>
