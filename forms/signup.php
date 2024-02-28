<?php

include($_SERVER['DOCUMENT_ROOT'] . "/.backend/library.php");

// Receive POST data.
$name = $_POST['name'];
$email = $_POST['email'];

// Validate entered data.
if (
    // Username validation.
    validate_name($name) and
    // Email validation.
    validate_email($email)
) { // If validation suceeds, save to mailing list and direct to success page.
    submit_to_mailing_list($name, $email);
    echo("<meta http-equiv=\"refresh\" content=\"0; url=/success.html\" />");
} else {
    // If validation fails, direct to failure page.
    echo("<meta http-equiv=\"refresh\" content=\"0; url=/failure.html\" />");
}

?>