<?php
/* ════════════════════════════════════════════
   SECTION: BOOTSTRAP

   - Enforce POST-only access
   - Parse JSON body
   - Route to the correct action handler
   ════════════════════════════════════════════ */

declare(strict_types=1);

// Only accept POST; reject everything else
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

header('Content-Type: application/json');

// Parse the JSON request body
$rawBody = file_get_contents('php://input');
$input   = json_decode($rawBody, true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    exit;
}

$action = $input['action'] ?? '';

/*
 * Icecounter diagnostics toggle.
 * false = generic client error + trace ID
 * true  = include detailed exception text in API responses
 */
define('ICECOUNTER_DEBUG_ERRORS', false);

/*
 * Server-side logging toggle.
 * Keep true if you want trace IDs to have matching error_log entries.
 */
define('ICECOUNTER_LOG_ERRORS', false);

require_once __DIR__ . '/library.php';

/**
 * Icecounter DB accessor.
 */
function getDB(): PDO
{
    return get_shared_pdo();
}


/* ════════════════════════════════════════════
   SECTION: HELPERS
   ════════════════════════════════════════════ */

/**
 * Validate that every required field exists, is a
 * non-empty string, and passes a length check (≤64).
 * Returns the name of the first failing field, or null.
 */
function validateFields(array $input, array $fields): ?string
{
    foreach ($fields as $field) {
        $val = $input[$field] ?? '';
        if (!is_string($val) || trim($val) === '' || strlen($val) > 64) {
            return $field;
        }
    }
    return null;
}

/**
 * Return ordinal suffix for day numbers (1st, 2nd, 3rd, etc.).
 */
function ordinalSuffix(int $day): string
{
    if ($day % 100 >= 11 && $day % 100 <= 13) {
        return 'th';
    }

    return match ($day % 10) {
        1 => 'st',
        2 => 'nd',
        3 => 'rd',
        default => 'th',
    };
}

/**
 * Format DB timestamp like: April 12th, 2026 2:22PM
 */
function formatLogTimestamp(string $timestamp): string
{
    $dt = new DateTime($timestamp);
    $day = (int) $dt->format('j');

    return $dt->format('F ') . $day . ordinalSuffix($day) . $dt->format(', Y g:iA');
}

/**
 * Authenticate key pair and return user row if valid.
 */
function authenticateUser(PDO $pdo, string $passwordA, string $passwordB): ?array
{
    $stmt = $pdo->prepare(
        'SELECT id, passwordA, passwordB_hash, icecream, monster
           FROM icecounter
          WHERE passwordA = ?
          LIMIT 1'
    );
    $stmt->execute([$passwordA]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($passwordB, $row['passwordB_hash'])) {
        return null;
    }

    return $row;
}

/**
 * Emit a structured 500 response and write traceable logs.
 */
function respondServerError(string $context, Throwable $error): void
{
    $traceId = uniqid('ic_', true);

    if (defined('ICECOUNTER_LOG_ERRORS') && ICECOUNTER_LOG_ERRORS) {
        error_log(sprintf(
            'icecounter %s [%s]: %s',
            $context,
            $traceId,
            $error->getMessage()
        ));
    }

    http_response_code(500);

    if (defined('ICECOUNTER_DEBUG_ERRORS') && ICECOUNTER_DEBUG_ERRORS) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Server error in ' . $context,
            'traceId' => $traceId,
            'debug' => [
                'exception' => get_class($error),
                'error' => $error->getMessage(),
                'code' => (string) $error->getCode(),
            ],
        ]);
        return;
    }

    echo json_encode([
        'status' => 'error',
        'message' => 'Server error. Trace ID: ' . $traceId,
    ]);
}


/* ════════════════════════════════════════════
   SECTION: ACTION ROUTER
   ════════════════════════════════════════════ */

switch ($action) {

    /* ─────────────────────────────────────────
       ACTION: login
       Check that the key pair exists and the
       password verifies, then return counts.
       ───────────────────────────────────────── */
    case 'login': {
        if (validateFields($input, ['passwordA', 'passwordB'])) {
            echo json_encode(['status' => 'invalid']);
            exit;
        }

        $pA = trim($input['passwordA']);
        $pB = trim($input['passwordB']);

        try {
            $pdo = getDB();

            $lookup = $pdo->prepare(
                'SELECT id, passwordB_hash FROM icecounter WHERE passwordA = ? LIMIT 1'
            );
            $lookup->execute([$pA]);
            $existing = $lookup->fetch();

            if (!$existing) {
                echo json_encode(['status' => 'not_found']);
                exit;
            }

            $row = authenticateUser($pdo, $pA, $pB);
            if (!$row) {
                echo json_encode(['status' => 'wrong_password']);
                exit;
            }

            echo json_encode([
                'status'   => 'ok',
                'icecream' => (int) $row['icecream'],
                'monster'  => (int) $row['monster'],
            ]);

        } catch (Throwable $e) {
            respondServerError('login', $e);
        }
        break;
    }


    /* ─────────────────────────────────────────
       ACTION: create
       Insert a new key pair row with both
       counters initialised to zero.
       passwordB is hashed with bcrypt before
       being written to the database.
       ───────────────────────────────────────── */
    case 'create': {
        if (validateFields($input, ['passwordA', 'passwordB'])) {
            echo json_encode(['status' => 'invalid']);
            exit;
        }

        $pA   = trim($input['passwordA']);
        $pB   = trim($input['passwordB']);
        $hash = password_hash($pB, PASSWORD_BCRYPT);

        try {
            $pdo  = getDB();
            $stmt = $pdo->prepare(
                'INSERT INTO icecounter (passwordA, passwordB_hash, icecream, monster)
                      VALUES (?, ?, 0, 0)'
            );
            $stmt->execute([$pA, $hash]);

            echo json_encode(['status' => 'ok']);

        } catch (PDOException $e) {
            // SQLSTATE 23000 = integrity constraint violation (duplicate key)
            if ($e->getCode() === '23000') {
                echo json_encode(['status' => 'exists']);
            } else {
                respondServerError('create', $e);
            }
        } catch (Throwable $e) {
            respondServerError('create', $e);
        }
        break;
    }


    /* ─────────────────────────────────────────
       ACTION: increment
       Re-authenticate the key pair, then
       atomically increment the requested field.

       The field name is checked against a strict
       whitelist BEFORE being interpolated into
       the query — this is the only safe way to
       use a dynamic column name with PDO.
       ───────────────────────────────────────── */
    case 'increment': {
        if (validateFields($input, ['passwordA', 'passwordB'])) {
            echo json_encode(['status' => 'invalid']);
            exit;
        }

        $pA    = trim($input['passwordA']);
        $pB    = trim($input['passwordB']);
        $field = $input['field'] ?? '';
        $description = trim((string) ($input['description'] ?? ''));

        // ── Whitelist: only these two column names are permitted ──
        $allowedFields = ['icecream', 'monster'];
        if (!in_array($field, $allowedFields, true)) {
            echo json_encode(['status' => 'invalid']);
            exit;
        }

        // Description is now required for each increment log.
        if ($description === '' || strlen($description) > 280) {
            echo json_encode(['status' => 'invalid_description']);
            exit;
        }

        try {
            $pdo = getDB();

            // Re-verify credentials on every write
            $row = authenticateUser($pdo, $pA, $pB);
            if (!$row) {
                echo json_encode(['status' => 'unauthorized']);
                exit;
            }

            $id = (int) $row['id'];

            $pdo->beginTransaction();

            // $field is whitelisted above — safe to interpolate
            $update = $pdo->prepare(
                "UPDATE icecounter SET {$field} = {$field} + 1 WHERE id = ?"
            );
            $update->execute([$id]);

            $log = $pdo->prepare(
                'INSERT INTO icecounter_logs (key_a, entry_type, description)
                      VALUES (?, ?, ?)'
            );
            $log->execute([$pA, $field, $description]);

            // Return the new value so the UI stays in sync
            $fetch = $pdo->prepare(
                "SELECT {$field} AS val FROM icecounter WHERE id = ?"
            );
            $fetch->execute([$id]);
            $newRow = $fetch->fetch();

            $logFetch = $pdo->prepare(
                'SELECT created_at
                   FROM icecounter_logs
                  WHERE log_id = LAST_INSERT_ID()'
            );
            $logFetch->execute();
            $logRow = $logFetch->fetch();

            $pdo->commit();

            echo json_encode([
                'status'   => 'ok',
                'newValue' => (int) $newRow['val'],
                'description' => $description,
                'entryType' => $field,
                'timestamp' => $logRow ? formatLogTimestamp($logRow['created_at']) : null,
            ]);

        } catch (Throwable $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            respondServerError('increment', $e);
        }
        break;
    }


    /* ─────────────────────────────────────────
       ACTION: list_logs
       Return paginated logs for the authenticated
       key pair. Client requests in pages of 5.
       ───────────────────────────────────────── */
    case 'list_logs': {
        if (validateFields($input, ['passwordA', 'passwordB'])) {
            echo json_encode(['status' => 'invalid']);
            exit;
        }

        $pA = trim($input['passwordA']);
        $pB = trim($input['passwordB']);

        $offset = (int) ($input['offset'] ?? 0);
        $limit  = (int) ($input['limit'] ?? 5);

        if ($offset < 0) {
            $offset = 0;
        }
        if ($limit < 1 || $limit > 50) {
            $limit = 5;
        }

        try {
            $pdo = getDB();

            $row = authenticateUser($pdo, $pA, $pB);
            if (!$row) {
                echo json_encode(['status' => 'unauthorized']);
                exit;
            }

            $stmt = $pdo->prepare(
                'SELECT log_id, key_a, entry_type, description, created_at
                   FROM icecounter_logs
                  WHERE key_a = ?
                  ORDER BY log_id DESC
                  LIMIT ? OFFSET ?'
            );
            $stmt->bindValue(1, $pA, PDO::PARAM_STR);
            $stmt->bindValue(2, $limit, PDO::PARAM_INT);
            $stmt->bindValue(3, $offset, PDO::PARAM_INT);
            $stmt->execute();
            $logs = $stmt->fetchAll();

            $mapped = array_map(
                static function (array $log): array {
                    return [
                        'logId' => (int) $log['log_id'],
                        'keyA' => $log['key_a'],
                        'entryType' => $log['entry_type'],
                        'description' => $log['description'],
                        'timestamp' => formatLogTimestamp($log['created_at']),
                    ];
                },
                $logs
            );

            echo json_encode([
                'status' => 'ok',
                'logs' => $mapped,
            ]);

        } catch (Throwable $e) {
            respondServerError('list_logs', $e);
        }
        break;
    }


    /* ─────────────────────────────────────────
       DEFAULT: Unknown action
       ───────────────────────────────────────── */
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Unknown action']);
}
