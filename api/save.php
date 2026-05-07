<?php
/**
 * Heroes Senior Softball - Data API
 * Simple PHP endpoint for saving JSON data on shared hosting
 * Upload this file to your web host with the rest of the site
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');

// ── CONFIGURATION ──
$PASSWORD = 'heroes2024'; // CHANGE THIS before deploying!
$DATA_DIR = __DIR__ . '/../data/';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200); exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit;
}

$input = json_decode(file_get_contents('php://input'), true);

// Auth check
if (empty($input['password']) || $input['password'] !== $PASSWORD) {
  http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit;
}

$type = preg_replace('/[^a-z_]/', '', $input['type'] ?? '');
$data = $input['data'] ?? null;

if (!$type || !$data) {
  http_response_code(400); echo json_encode(['error' => 'Missing type or data']); exit;
}

// Create data directory if it doesn't exist
if (!is_dir($DATA_DIR)) {
  mkdir($DATA_DIR, 0755, true);
}

$filePath = $DATA_DIR . $type . '.json';
$json = json_encode($data, JSON_PRETTY_PRINT);

if (file_put_contents($filePath, $json) !== false) {
  echo json_encode(['success' => true, 'file' => $type . '.json']);
} else {
  http_response_code(500); echo json_encode(['error' => 'Failed to write file']);
}
