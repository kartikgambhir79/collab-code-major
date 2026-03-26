<?php
session_start();
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

    if ($action === 'invite') {
        $data = json_decode(file_get_contents('php://input'), true);
        $projectId = $data['project_id'] ?? null;
        $username = $data['username'] ?? '';

        if (!$projectId || !$username) {
            echo json_encode(['success' => false, 'message' => 'Missing project ID or username']);
            exit;
        }

        // Check if user exists
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'User not found']);
            exit;
        }

        $userId = $user['id'];

        // Check if user is owner
        $stmt = $db->prepare('SELECT owner FROM projects WHERE id = ?');
        $stmt->execute([$projectId]);
        $project = $stmt->fetch();

        if ($project && $project['owner'] === $username) {
            echo json_encode(['success' => false, 'message' => 'User is already the owner of this project']);
            exit;
        }

        // Check if already in collaborators table
        $stmt = $db->prepare('SELECT id FROM collaborators WHERE project_id = ? AND user_id = ?');
        $stmt->execute([$projectId, $userId]);
        $existing = $stmt->fetch();

        if ($existing) {
            echo json_encode(['success' => false, 'message' => 'User is already invited or a collaborator']);
            exit;
        }

        $stmt = $db->prepare("INSERT INTO collaborators (project_id, user_id, status) VALUES (?, ?, 'pending')");
        $stmt->execute([$projectId, $userId]);
        
        echo json_encode(['success' => true, 'message' => 'Invitation sent successfully']);
    } elseif ($action === 'search_users') {
        $q = $_GET['q'] ?? '';
        if (strlen($q) < 1) { // Accept at least 1 character for responsiveness
            echo json_encode([]);
            exit;
        }

        $stmt = $db->prepare('SELECT id, username FROM users WHERE username LIKE ? LIMIT 5');
        // Using wildcard at the end for typeahead matching start of string is usually better, but %like% handles mid-string
        $stmt->execute(['%' . $q . '%']);
        $users = $stmt->fetchAll();

        echo json_encode($users);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
