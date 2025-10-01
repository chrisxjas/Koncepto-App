<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// Show errors (for debugging only, remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? '';

if (!$email) {
    echo json_encode(["success" => false, "message" => "Missing email"]);
    exit;
}

// Generate 6-digit code
$verification_code = rand(100000, 999999);

$subject = "Koncepto - Email Verification Code";
$message = "Your verification code is: " . $verification_code;
$headers = "From: konceptoapp@gmail.com\r\n";
$headers .= "Reply-To: konceptoapp@gmail.com\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// Try sending mail
if (mail($email, $subject, $message, $headers)) {
    echo json_encode([
        "success" => true,
        "message" => "Verification email sent",
        "code" => $verification_code
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Failed to send email (mail() not working)"
    ]);
}
