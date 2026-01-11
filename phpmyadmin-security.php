<?php
/**
 * Custom phpMyAdmin configuration for security
 * This file is included by the main config to add security settings
 */

// Disable detailed error display
$cfg['Error_Handler'] = [
    'display' => false,
    'gather' => true,
    'message' => 'Access denied. Please check your credentials.'
];

// Hide version information
$cfg['ShowServerInfo'] = false;
$cfg['ShowDbInfo'] = false;
$cfg['ShowCreateDb'] = false;
$cfg['SuggestDBName'] = false;

// Security settings
$cfg['AllowArbitraryServer'] = false;
$cfg['CheckConfigurationPermissions'] = false;
$cfg['AllowThirdPartyFraming'] = false;

// Hide PHP errors that might reveal sensitive information
error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');

// Custom error handler for MySQL connection errors
function custom_error_handler($errno, $errstr) {
    // Suppress MySQL connection errors and show generic message
    if (strpos($errstr, 'mysqli::real_connect') !== false ||
        strpos($errstr, 'Access denied for user') !== false ||
        strpos($errstr, 'No such file or directory') !== false) {
        return true; // Suppress the error
    }
    return false; // Let other errors be handled normally
}

set_error_handler('custom_error_handler');

// Suppress MySQL connection warnings and errors
mysqli_report(MYSQLI_REPORT_OFF);

// Custom exception handler for connection errors
function custom_exception_handler($exception) {
    if (strpos($exception->getMessage(), 'Access denied') !== false ||
        strpos($exception->getMessage(), 'real_connect') !== false) {
        // Don't display the exception
        return;
    }
    throw $exception;
}

set_exception_handler('custom_exception_handler');

?>