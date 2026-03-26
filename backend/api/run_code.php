<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // For dev purposes
header('Access-Control-Allow-Headers: Content-Type');

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['code']) || !isset($data['language'])) {
    echo json_encode(['success' => false, 'message' => 'Missing code or language']);
    exit();
}

$code = $data['code'];
$language = strtolower($data['language']);

$tmp_file = sys_get_temp_dir() . '/' . uniqid('code_') . ($language === 'python' ? '.py' : '.js');
file_put_contents($tmp_file, $code);

$output = '';
$error = '';

try {
    if ($language === 'javascript') {
        // execute node
        $command = escapeshellcmd("node " . $tmp_file) . " 2>&1";
        $output = shell_exec($command);
    } elseif ($language === 'python') {
        // execute python
        $command = escapeshellcmd("python " . $tmp_file) . " 2>&1";
        $output = shell_exec($command);
    } else {
        $output = "Unsupported language.";
    }
} catch (Exception $e) {
    $error = $e->getMessage();
}

// Cleanup
@unlink($tmp_file);

if ($error) {
    echo json_encode(['success' => false, 'output' => $error]);
} else {
    echo json_encode(['success' => true, 'output' => $output ?? '']);
}
?>
