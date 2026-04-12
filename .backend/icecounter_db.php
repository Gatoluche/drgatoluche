<?php
require_once __DIR__ . '/library.php';

/* ════════════════════════════════════════════
   SECTION: PDO FACTORY (ICECOUNTER)

   Delegates to the shared backend DB layer so
   all site features use one access strategy.
   ════════════════════════════════════════════ */
function getDB(): PDO
{
    return get_shared_pdo();
}
