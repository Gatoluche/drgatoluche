<?php

/*======= SHARED DATABASE CONFIG =======*/
function load_db_config(): array {
    $candidates = [
        ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/../data/sql.php',
        dirname(__DIR__, 2) . '/data/sql.php',
    ];

    $sqlConfigPath = null;
    foreach ($candidates as $candidate) {
        if (is_string($candidate) && $candidate !== '' && file_exists($candidate)) {
            $sqlConfigPath = $candidate;
            break;
        }
    }

    if ($sqlConfigPath === null) {
        throw new RuntimeException('Database config file not found: data/sql.php');
    }

    require $sqlConfigPath;

    if (
        !isset($servername, $username, $password, $dbname) ||
        !is_string($servername) ||
        !is_string($username) ||
        !is_string($password) ||
        !is_string($dbname)
    ) {
        throw new RuntimeException('Invalid database config variables in data/sql.php');
    }

    return [
        'host' => $servername,
        'user' => $username,
        'pass' => $password,
        'name' => $dbname,
    ];
}

/*======= DATABASE CONNECTION FUNCTION =======*/
function get_shared_pdo(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $config = load_db_config();
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=utf8mb4',
            $config['host'],
            $config['name']
        );

        $pdo = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }

    return $pdo;
}

// Backward-compatible alias kept for existing includes/callers.
function sql_connect(): PDO {
    return get_shared_pdo();
}

/*======= STRING VALIDATION FUNCTIONS =======*/

function validate_name ($name) {
    if (!is_string($name)) {
        return false;
    }

    $trimmed = trim($name);
    $length = function_exists('mb_strlen') ? mb_strlen($trimmed, 'UTF-8') : strlen($trimmed);
    return $trimmed !== '' && $length <= 120;
}

function validate_email ($email) {
    return is_string($email) && filter_var(trim($email), FILTER_VALIDATE_EMAIL) !== false;
}

/*======= SQL CONNECTION FUNCTIONS =======*/

function submit_to_mailing_list ($name, $email) {
    $pdo = get_shared_pdo();

    $stmt = $pdo->prepare(
        'INSERT INTO Users (Name, Email, IP) VALUES (?, ?, ?)'
    );

    $stmt->execute([
        trim((string) $name),
        trim((string) $email),
        (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'),
    ]);
}

function record_code_entry ($input) {
    $pdo = get_shared_pdo();

    $stmt = $pdo->prepare(
        'INSERT INTO Codes (Code, IP) VALUES (?, ?)'
    );

    $stmt->execute([
        trim((string) $input),
        (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'),
    ]);
}
?>