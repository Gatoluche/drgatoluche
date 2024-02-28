<?php

/*======= DATABASE CONNECTION FUNCTION =======*/
function sql_connect() {

    include($_SERVER['DOCUMENT_ROOT'] . "/../data/sql.php");

    // Start up MySQL error reporting.
    //mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);  // Security flaw. Keep turned off unless necessary.

    // Declare SQL connection.
    $sql_conn = new mysqli(
        $servername,    // Hostname defined in data/absolute.php
        $username,      // Username defined in sitewide_data.php
        $password,      // Password defined in data/absolute.php
        $dbname         // Database name chosen by the user.
    );

    // Setting charset
    mysqli_set_charset($sql_conn, "utf8");

    return($sql_conn);

}

/*======= STRING VALIDATION FUNCTIONS =======*/

function validate_name ($name) {
    //TODO Make it actually validate the fucking username in the future.
    return true;
}

function validate_email ($email) {
    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return true;
    } // Else
    return false;
}

/*======= SQL CONNECTION FUNCTIONS =======*/

function submit_to_mailing_list ($name, $email) {

    // Connect to static database
    $sql_conn = sql_connect();

    
    // Prepare query statement
    $stmt = $sql_conn->prepare(
        "INSERT INTO Users (Name, Email, IP) VALUES (?,?,?)"
    );

    // Bind parameters to query (+ user IP)
    $stmt->bind_param("sss", $name, $email, $_SERVER['REMOTE_ADDR']);
    // Execute query
    $stmt->execute();
}
?>