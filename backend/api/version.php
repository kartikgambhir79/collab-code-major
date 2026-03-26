<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../db/connection.php';
$action = $_GET['action'] ?? '';

try {
    $db = (new Database())->getDb();

    if ($action === 'save') {
        $data = json_decode(file_get_contents('php://input'), true);
        $project_id = $data['project_id'] ?? null;
        $saved_by   = $data['saved_by'] ?? 'unknown';
        $content    = $data['content'] ?? '';
        $label      = $data['label'] ?? 'Manual Save';

        if (!$project_id) {
            echo json_encode(['success' => false, 'message' => 'Missing project ID']);
            exit;
        }

        // Keep only last 20 versions per project to avoid DB bloat
        $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM code_versions WHERE project_id = ?");
        $stmt->execute([$project_id]);
        $row = $stmt->fetch();
        if ($row['cnt'] >= 20) {
            $del = $db->prepare("DELETE FROM code_versions WHERE project_id = ? ORDER BY created_at ASC LIMIT 1");
            $del->execute([$project_id]);
        }

        $stmt = $db->prepare("INSERT INTO code_versions (project_id, saved_by, content, label) VALUES (?, ?, ?, ?)");
        $stmt->execute([$project_id, $saved_by, $content, $label]);

        echo json_encode(['success' => true, 'version_id' => $db->lastInsertId()]);

    } elseif ($action === 'list') {
        $project_id = $_GET['project_id'] ?? '';
        $stmt = $db->prepare("
            SELECT id, saved_by, label, DATE_FORMAT(created_at, '%d %b %Y, %H:%i') as created_at
            FROM code_versions WHERE project_id = ? ORDER BY created_at DESC LIMIT 20
        ");
        $stmt->execute([$project_id]);
        echo json_encode($stmt->fetchAll());

    } elseif ($action === 'get') {
        $version_id = $_GET['id'] ?? '';
        $stmt = $db->prepare("SELECT content FROM code_versions WHERE id = ?");
        $stmt->execute([$version_id]);
        $row = $stmt->fetch();
        echo json_encode($row ?: ['success' => false, 'message' => 'Not found']);

    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
