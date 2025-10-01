<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include __DIR__ . '/db_connection.php'; // ✅ separate DB connection

$first_name = $_POST['first_name'] ?? '';
$last_name  = $_POST['last_name'] ?? '';
$cp_no      = $_POST['cp_no'] ?? '';
$email      = $_POST['email'] ?? '';
$password   = $_POST['password'] ?? '';
$role       = 'user';
$credentialsPath = null;

// Validation
if (!$first_name || !$last_name || !$cp_no || !$email || !$password) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit();
}

// Check duplicate email
$check = $conn->prepare("SELECT id FROM users WHERE email = ?");
$check->bind_param("s", $email);
$check->execute();
$check->store_result();
if ($check->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "Email already exists"]);
    $check->close();
    exit();
}
$check->close();

// Handle credentials file upload
if (isset($_FILES['credentials']) && $_FILES['credentials']['error'] === UPLOAD_ERR_OK) {
    $fileTmpPath = $_FILES['credentials']['tmp_name'];
    $fileName = uniqid() . '_' . basename($_FILES['credentials']['name']);
    $uploadDir = __DIR__ . '/uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

    $destination = $uploadDir . $fileName;
    if (!move_uploaded_file($fileTmpPath, $destination)) {
        echo json_encode(["success" => false, "message" => "File upload failed"]);
        exit();
    }

    $credentialsPath = 'uploads/' . $fileName;
} else {
    echo json_encode(["success" => false, "message" => "No file uploaded"]);
    exit();
}

// Insert user
$now = date('Y-m-d H:i:s');
$stmt = $conn->prepare("INSERT INTO users (first_name, last_name, cp_no, email, password, credentials, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sssssssss", $first_name, $last_name, $cp_no, $email, $password, $credentialsPath, $role, $now, $now);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Registered successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Registration failed: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
