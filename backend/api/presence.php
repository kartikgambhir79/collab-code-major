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

    if ($action === 'ping') {
        // Upsert: mark user as online with cursor position
        $data = json_decode(file_get_contents('php://input'), true);
        $project_id   = $data['project_id'] ?? null;
        $username     = $data['username'] ?? '';
        $cursor_line  = $data['cursor_line'] ?? 1;
        $cursor_col   = $data['cursor_column'] ?? 1;
        $is_typing    = $data['is_typing'] ?? 0;

        if (!$project_id || !$username) {
            echo json_encode(['success' => false, 'message' => 'Missing fields']);
            exit;
        }

        $stmt = $db->prepare("
            INSERT INTO presence (project_id, username, cursor_line, cursor_column, is_typing, last_ping)
            VALUES (?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                cursor_line = VALUES(cursor_line),
                cursor_column = VALUES(cursor_column),
                is_typing = VALUES(is_typing),
                last_ping = NOW()
        ");
        $stmt->execute([$project_id, $username, $cursor_line, $cursor_col, $is_typing]);
        echo json_encode(['success' => true]);

    } elseif ($action === 'list') {
        $project_id = $_GET['project_id'] ?? '';
        // Consider users online if they pinged in the last 12 seconds
        $stmt = $db->prepare("
            SELECT username, cursor_line, cursor_column, is_typing
            FROM presence
            WHERE project_id = ? AND last_ping >= NOW() - INTERVAL 12 SECOND
        ");
        $stmt->execute([$project_id]);
        echo json_encode($stmt->fetchAll());

    } elseif ($action === 'leave') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("DELETE FROM presence WHERE project_id = ? AND username = ?");
        $stmt->execute([$data['project_id'], $data['username']]);
        echo json_encode(['success' => true]);

    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
