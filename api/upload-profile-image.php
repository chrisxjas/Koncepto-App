<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Include DB connection
include __DIR__ . '/db_connection.php';

if (!isset($_POST['id']) || !isset($_FILES['photo'])) {
    echo json_encode(["success" => false, "message" => "Missing file or user ID"]);
    exit;
}

$user_id = intval($_POST['id']);
$photo = $_FILES['photo'];
$upload_dir = "uploads/";

// Ensure upload directory exists
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// Check current image from DB
$stmt = $conn->prepare("SELECT profilepic FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$current = $result->fetch_assoc();
$stmt->close();

// Delete old file if exists
if ($current && $current['profilepic']) {
    $old_path = $upload_dir . $current['profilepic'];
    if (file_exists($old_path)) {
        unlink($old_path);
    }
}

// Upload new file
$filename = uniqid() . "_" . basename($photo['name']);
$target_file = $upload_dir . $filename;

if (move_uploaded_file($photo['tmp_name'], $target_file)) {
    $update = $conn->prepare("UPDATE users SET profilepic = ?, updated_at = NOW() WHERE id = ?");
    $update->bind_param("si", $filename, $user_id);
    if ($update->execute()) {
        echo json_encode(["success" => true, "message" => "Profile updated", "profilepic" => $filename]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update database"]);
    }
    $update->close();
} else {
    echo json_encode(["success" => false, "message" => "Failed to upload image"]);
}

$conn->close();
?>
