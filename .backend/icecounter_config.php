<?php
/*
 * Icecounter backend diagnostics toggle.
 *
 * false = production-safe responses (generic message + trace id)
 * true  = include detailed exception messages in API JSON responses
 */
define('ICECOUNTER_DEBUG_ERRORS', true);

/*
 * Keep server-side logging on so PHP error logs capture stack context.
 */
define('ICECOUNTER_LOG_ERRORS', true);
