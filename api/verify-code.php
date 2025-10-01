<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

session_start();
$data = json_decode(file_get_contents("php://input"), true);

$email = $data['email'] ?? '';
$code = $data['code'] ?? '';

if (!$email || !$code) {
    echo json_encode(['success' => false, 'message' => 'Email and code required']);
    exit;
}

if (isset($_SESSION['verification_code'][$email]) && $_SESSION['verification_code'][$email] == $code) {
    unset($_SESSION['verification_code'][$email]); // clear code after success
    echo json_encode(['success' => true, 'message' => 'Verified']);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired code']);
}
?>
