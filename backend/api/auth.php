<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
require_once __DIR__ . '/../db/connection.php';

$action = $_POST['action'] ?? '';
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(["success" => false, "message" => "Fields cannot be empty."]);
    exit();
}

try {
    $db = (new Database())->getDb();

    if ($action === 'register') {
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            echo json_encode(["success" => false, "message" => "Username already taken."]);
            exit();
        }

        $hashed_password = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $db->prepare('INSERT INTO users (username, password, projects_created, likes_received, collaborations_done) VALUES (?, ?, 0, 0, 0)');
        $stmt->execute([$username, $hashed_password]);

        $_SESSION['user_id'] = $db->lastInsertId();
        $_SESSION['username'] = $username;
        
        echo json_encode(["success" => true]);
        
    } elseif ($action === 'login') {
        $stmt = $db->prepare('SELECT id, username, password FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid credentials."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Invalid action."]);
    }
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "DB Error: " . $e->getMessage()]);
}
?>
