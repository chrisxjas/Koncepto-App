<?php
// ---- DATABASE CONFIG ----
$host = "auth-db657.hstgr.io";        // DB_HOST
$user = "u874626598_teamvanguard";    // DB_USERNAME
$pass = "KonceptoTeamVanguard2025!";  // DB_PASSWORD
$dbname = "u874626598_koncepto";      // DB_DATABASE
$port = 3306;                         // DB_PORT

$conn = new mysqli($host, $user, $pass, $dbname, $port);

if ($conn->connect_error) {
    die(json_encode([
        "success" => false,
        "message" => "Database connection failed: " . $conn->connect_error
    ]));
}

// Optional: set charset to avoid encoding issues
$conn->set_charset("utf8mb4");
?>
