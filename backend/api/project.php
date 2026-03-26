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

    if ($action === 'list') {
        $stmt = $db->query("SELECT id, title, language, visibility, likes, owner FROM projects WHERE visibility = 'public' ORDER BY likes DESC");
        $result = $stmt->fetchAll();
        echo json_encode($result);
        
    } elseif ($action === 'create') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $title = $data['title'] ?? 'New Project';
        $language = $data['language'] ?? 'javascript';
        $visibility = $data['visibility'] ?? 'public';
        $owner = $data['owner'] ?? 'anonymous';

        $stmt = $db->prepare("INSERT INTO projects (title, language, visibility, owner) VALUES (?, ?, ?, ?)");
        $stmt->execute([$title, $language, $visibility, $owner]);
        
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        
    } elseif ($action === 'get') {
        $id = $_GET['id'] ?? '';
        $username = $_GET['username'] ?? '';
        $stmt = $db->prepare('SELECT * FROM projects WHERE id = ?');
        $stmt->execute([$id]);
        $doc = $stmt->fetch();

        if ($doc) {
            $can_edit = false;
            if ($doc['owner'] === $username) {
                $can_edit = true;
            } else if ($username !== '') {
                $stmt2 = $db->prepare('SELECT c.id FROM collaborators c JOIN users u ON c.user_id = u.id WHERE c.project_id = ? AND u.username = ?');
                $stmt2->execute([$id, $username]);
                if ($stmt2->fetch()) {
                    $can_edit = true;
                }
            }
            $doc['can_edit'] = $can_edit;
            echo json_encode($doc);
        } else {
            echo json_encode(['success' => false, 'message' => 'Not found']);
        }
    } elseif ($action === 'update') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'Missing project ID']);
            exit;
        }

        $title = $data['title'] ?? 'Untitled Project';
        $language = $data['language'] ?? 'javascript';
        $visibility = $data['visibility'] ?? 'public';
        $content = $data['content'] ?? '';

        $stmt = $db->prepare("UPDATE projects SET title = ?, language = ?, visibility = ?, content = ? WHERE id = ?");
        $stmt->execute([$title, $language, $visibility, $content, $id]);
        
        echo json_encode(['success' => true, 'message' => 'Project updated successfully']);

    } elseif ($action === 'sync_push') {
        // Lightweight real-time code sync push — only updates content + last_editor
        $data = json_decode(file_get_contents('php://input'), true);
        $id      = $data['id'] ?? null;
        $content = $data['content'] ?? '';
        $editor  = $data['editor'] ?? 'unknown';

        if (!$id) { echo json_encode(['success' => false]); exit; }

        // Try to add last_editor column if it doesn't exist yet (run once, safe to repeat)
        try {
            $db->exec("ALTER TABLE projects ADD COLUMN last_editor VARCHAR(255) DEFAULT NULL");
        } catch (Exception $e) { /* column already exists — ignore */ }

        $stmt = $db->prepare("UPDATE projects SET content = ?, last_editor = ? WHERE id = ?");
        $stmt->execute([$content, $editor, $id]);
        echo json_encode(['success' => true]);

    } elseif ($action === 'sync_pull') {
        // Lightweight real-time code sync pull — returns content + who last edited
        $id = $_GET['id'] ?? '';
        try {
            $db->exec("ALTER TABLE projects ADD COLUMN last_editor VARCHAR(255) DEFAULT NULL");
        } catch (Exception $e) { /* already exists */ }
        $stmt = $db->prepare("SELECT content, last_editor FROM projects WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        echo json_encode($row ?: ['content' => '', 'last_editor' => null]);

    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
