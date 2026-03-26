<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../db/connection.php';

$action = $_GET['action'] ?? '';

try {
    $db = (new Database())->getDb();

    if ($action === 'send') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $project_id = $data['project_id'];
        $sender = $data['sender'];
        $message = $data['message'];

        $stmt = $db->prepare('INSERT INTO chats (project_id, sender, message) VALUES (?, ?, ?)');
        $stmt->execute([$project_id, $sender, $message]);
        
        echo json_encode(['success' => true]);
        
    } elseif ($action === 'history') {
        $project_id = $_GET['project_id'] ?? '';
        
        $stmt = $db->prepare('SELECT id, sender, message as text, DATE_FORMAT(created_at, "%H:%i") as time FROM chats WHERE project_id = ? ORDER BY created_at ASC LIMIT 50');
        $stmt->execute([$project_id]);
        $messages = $stmt->fetchAll();
        
        echo json_encode($messages);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
