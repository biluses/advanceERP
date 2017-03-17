<?php if (!defined('DATATABLES')) exit(); // Ensure being used in DataTables env.

// Enable error reporting for debugging (remove for production)
error_reporting(E_ALL);
ini_set('display_errors', '1');


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Database user / pass
 */
// Database type: "Mysql", "Postgres", "Sqlserver", "Sqlite" or "Oracle"
$sql_details = array(
	"type" => "Mysql",  
	"user" => "root",      
	"pass" => "",       
	"host" => "localhost",       
	"port" => "3306",      
	"db"   => "advance2",       
	"dsn"  => "charset=utf8"       
);

// $sql_details = array(
// 	"type" => "Mysql",  
// 	"user" => "dbo672472483",      
// 	"pass" => "sOulm4dnessCocu",     
// 	"host" => "db672472483.db.1and1.com",       
// 	"port" => "3306",      
// 	"db"   => "db672472483",     
// 	"dsn"  => "charset=utf8"      
// );


