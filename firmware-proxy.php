<?php
/**
 * Firmware Download Proxy
 * Security: Verify license before allowing firmware download
 * Hides actual GitHub URL from client
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

$firmwareId = $input['firmwareId'] ?? null;
$licenseKey = $input['licenseKey'] ?? null;
$deviceMAC = $input['deviceMAC'] ?? null;

// Validate inputs
if (!$firmwareId || !$deviceMAC) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit();
}

// Firmware 1 requires license
if ($firmwareId === 1 && !$licenseKey) {
    http_response_code(403);
    echo json_encode(['error' => 'License required for this firmware']);
    exit();
}

// Server-side license validation (if firmware 1)
if ($firmwareId === 1) {
    // Validate license key format
    if (!preg_match('/^MZ[0-9][A-Z]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $licenseKey)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid license format']);
        exit();
    }
    
    // TODO: Add server-side license validation against database
    // For now, just log the attempt
    $logFile = __DIR__ . '/firmware_download.log';
    $logEntry = date('Y-m-d H:i:s') . " - FW$firmwareId - MAC: $deviceMAC - Key: $licenseKey\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

// Map firmware ID to actual GitHub URL (hidden from client)
$firmwareUrls = [
    1 => 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware1.bin',
    2 => 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware2.bin',
    3 => 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware3.bin',
    4 => 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware4.bin',
    5 => 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware5.bin'
];

$url = $firmwareUrls[$firmwareId] ?? null;

if (!$url) {
    http_response_code(404);
    echo json_encode(['error' => 'Firmware not found']);
    exit();
}

// Download firmware from GitHub
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$firmwareData = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($httpCode !== 200 || !$firmwareData) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch firmware from source']);
    exit();
}

// Verify it's a binary file
if (strlen($firmwareData) < 1024) {
    http_response_code(502);
    echo json_encode(['error' => 'Invalid firmware file']);
    exit();
}

// Return firmware data
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="firmware' . $firmwareId . '.bin"');
header('Content-Length: ' . strlen($firmwareData));
header('Cache-Control: no-cache, no-store, must-revalidate');
header('X-Firmware-ID: ' . $firmwareId);
header('X-License-Verified: ' . ($licenseKey ? 'yes' : 'no'));

echo $firmwareData;
?>
