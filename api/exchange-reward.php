<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// Include centralized DB connection
include __DIR__ . '/db_connection.php';

$response = ['success' => false, 'message' => ''];

// Get POST data
$data = json_decode(file_get_contents("php://input"));

if (isset($data->user_id) && isset($data->reward_id) && isset($data->required_points)) {
    $userId = intval($data->user_id);
    $rewardId = intval($data->reward_id);
    $requiredPoints = (int)$data->required_points;

    // Start transaction
    $conn->begin_transaction();

    try {
        // 1. Check user's current points balance
        $sqlCheckBalance = "SELECT points_balance FROM users WHERE id = ? FOR UPDATE";
        $stmtBalance = $conn->prepare($sqlCheckBalance);
        $stmtBalance->bind_param("i", $userId);
        $stmtBalance->execute();
        $resultBalance = $stmtBalance->get_result();
        $stmtBalance->close();

        if (!$resultBalance || $resultBalance->num_rows === 0) {
            throw new Exception("User not found.");
        }
        $user = $resultBalance->fetch_assoc();
        $currentBalance = (int)$user['points_balance'];

        if ($currentBalance < $requiredPoints) {
            throw new Exception("Insufficient points.");
        }

        // 2. Check reward stock and status
        $sqlCheckReward = "SELECT reward_name, stock FROM rewards WHERE id = ? AND status = 'active' FOR UPDATE";
        $stmtReward = $conn->prepare($sqlCheckReward);
        $stmtReward->bind_param("i", $rewardId);
        $stmtReward->execute();
        $resultReward = $stmtReward->get_result();
        $stmtReward->close();

        if (!$resultReward || $resultReward->num_rows === 0) {
            throw new Exception("Reward not found or inactive.");
        }
        $reward = $resultReward->fetch_assoc();
        $rewardName = $reward['reward_name'];
        $currentStock = (int)$reward['stock'];

        if ($currentStock <= 0) {
            throw new Exception("Reward is out of stock.");
        }

        // 3. Deduct points from user
        $newBalance = $currentBalance - $requiredPoints;
        $sqlUpdateUser = "UPDATE users SET points_balance = ? WHERE id = ?";
        $stmtUpdateUser = $conn->prepare($sqlUpdateUser);
        $stmtUpdateUser->bind_param("ii", $newBalance, $userId);
        if (!$stmtUpdateUser->execute()) {
            throw new Exception("Failed to update user points: " . $stmtUpdateUser->error);
        }
        $stmtUpdateUser->close();

        // 4. Decrease reward stock
        $newStock = $currentStock - 1;
        $sqlUpdateReward = "UPDATE rewards SET stock = ? WHERE id = ?";
        $stmtUpdateReward = $conn->prepare($sqlUpdateReward);
        $stmtUpdateReward->bind_param("ii", $newStock, $rewardId);
        if (!$stmtUpdateReward->execute()) {
            throw new Exception("Failed to update reward stock: " . $stmtUpdateReward->error);
        }
        $stmtUpdateReward->close();

        // 5. Record the points transaction
        $sqlRecordTransaction = "INSERT INTO points (user_id, product_id, order_id, earned_points, created_at, updated_at) VALUES (?, NULL, NULL, ?, NOW(), NOW())";
        $stmtPoints = $conn->prepare($sqlRecordTransaction);
        $pointsChange = -$requiredPoints;
        $stmtPoints->bind_param("ii", $userId, $pointsChange);
        if (!$stmtPoints->execute()) {
            throw new Exception("Failed to record points transaction: " . $stmtPoints->error);
        }
        $stmtPoints->close();

        // Commit transaction
        $conn->commit();
        $response['success'] = true;
        $response['message'] = "Reward '" . $rewardName . "' exchanged successfully!";

    } catch (Exception $e) {
        $conn->rollback();
        $response['message'] = $e->getMessage();
    } finally {
        $conn->close();
    }

} else {
    $response['message'] = "Invalid request data.";
}

echo json_encode($response);
?>
