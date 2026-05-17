<?php
/**
 * Persoenliche Studiennotizen fuer das Dashboard.
 */

declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../dashboard/session.php';

require_login();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = db();

try {
    switch ($method) {
        case 'GET':
            handle_get_notes($pdo);
            break;

        case 'POST':
            require_dashboard_write_request();
            handle_save_note($pdo);
            break;

        case 'DELETE':
            require_dashboard_write_request();
            handle_delete_note($pdo);
            break;

        default:
            json_error('Methode nicht erlaubt.', 405);
    }
} catch (Throwable $e) {
    json_error('Serverfehler.', 500);
}

function handle_get_notes(PDO $pdo): void {
    $studyId = validate_study_id($_GET['study_id'] ?? null);

    if (!study_notes_table_exists($pdo)) {
        json_response([
            'ok' => true,
            'study_id' => $studyId,
            'note' => null,
            'notes' => [],
        ]);
    }

    $stmt = $pdo->prepare("
        SELECT id, study_id, note, created_at, updated_at
        FROM study_notes
        WHERE study_id = ?
        ORDER BY updated_at DESC, id DESC
    ");
    $stmt->execute([$studyId]);
    $notes = $stmt->fetchAll();

    json_response([
        'ok' => true,
        'study_id' => $studyId,
        'note' => $notes[0] ?? null,
        'notes' => $notes,
    ]);
}

function handle_save_note(PDO $pdo): void {
    if (!study_notes_table_exists($pdo)) {
        json_error('Notizen sind noch nicht eingerichtet.', 503);
    }

    $body = read_json_body();
    $studyId = validate_study_id($body['study_id'] ?? null);
    $note = validate_note($body['note'] ?? null);

    $stmt = $pdo->prepare("
        SELECT id
        FROM study_notes
        WHERE study_id = ?
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
    ");
    $stmt->execute([$studyId]);
    $existingId = $stmt->fetchColumn();

    if ($existingId) {
        $stmt = $pdo->prepare("UPDATE study_notes SET note = ? WHERE id = ?");
        $stmt->execute([$note, (int)$existingId]);
        $id = (int)$existingId;
    } else {
        $stmt = $pdo->prepare("INSERT INTO study_notes (study_id, note) VALUES (?, ?)");
        $stmt->execute([$studyId, $note]);
        $id = (int)$pdo->lastInsertId();
    }

    json_response([
        'ok' => true,
        'note' => fetch_note_by_id($pdo, $id),
    ]);
}

function handle_delete_note(PDO $pdo): void {
    if (!study_notes_table_exists($pdo)) {
        json_response([
            'ok' => true,
            'deleted' => 0,
        ]);
    }

    $body = read_json_body();

    if (isset($body['id'])) {
        $id = filter_var($body['id'], FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);

        if ($id === false) {
            json_error('Ungueltige Notiz-ID.', 400);
        }

        $stmt = $pdo->prepare("DELETE FROM study_notes WHERE id = ?");
        $stmt->execute([(int)$id]);

        json_response([
            'ok' => true,
            'deleted' => $stmt->rowCount(),
        ]);
    }

    if (array_key_exists('study_id', $body)) {
        $studyId = validate_study_id($body['study_id']);
        $stmt = $pdo->prepare("DELETE FROM study_notes WHERE study_id = ?");
        $stmt->execute([$studyId]);

        json_response([
            'ok' => true,
            'deleted' => $stmt->rowCount(),
        ]);
    }

    json_error('id oder study_id erforderlich.', 400);
}

function validate_study_id($value): string {
    if (!is_string($value)) {
        json_error('study_id ist erforderlich.', 400);
    }

    $value = trim($value);
    if ($value === '' || strlen($value) > 64) {
        json_error('Ungueltige study_id.', 400);
    }

    return $value;
}

function validate_note($value): string {
    if (!is_string($value)) {
        json_error('note ist erforderlich.', 400);
    }

    $value = trim($value);
    if (function_exists('mb_strlen') && mb_strlen($value, 'UTF-8') > 2000) {
        json_error('Notiz ist zu lang.', 400);
    }

    if (!function_exists('mb_strlen') && strlen($value) > 2000) {
        json_error('Notiz ist zu lang.', 400);
    }

    return $value;
}

function fetch_note_by_id(PDO $pdo, int $id): ?array {
    $stmt = $pdo->prepare("
        SELECT id, study_id, note, created_at, updated_at
        FROM study_notes
        WHERE id = ?
    ");
    $stmt->execute([$id]);
    $note = $stmt->fetch();

    return $note ?: null;
}

function study_notes_table_exists(PDO $pdo): bool {
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = ?
    ");
    $stmt->execute(['study_notes']);

    return (int)$stmt->fetchColumn() > 0;
}
