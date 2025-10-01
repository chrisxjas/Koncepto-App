<?php
// Enable full error reporting (for development)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Include database connection
include __DIR__ . '/db_connection.php';

// Fetch id and school_name from schools table
$sql = "SELECT id, school_name FROM schools";
$result = $conn->query($sql);

$schools = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $schools[] = $row;
    }
}

echo json_encode([
    "success" => true,
    "schools" => $schools
]);

$conn->close();
?>
