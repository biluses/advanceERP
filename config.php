<?php
/**
 * For Development Purposes
 */
ini_set("display_errors", "on");

require __DIR__ . "/src/LS.php";
$LS = new \Fr\LS(array(
  "db" => array(
    "host" => "localhost",
    "port" => 3306,
    "username" => "root",  
    "password" => "",
    "name" => "advance2",
    "table" => "users"

    // "host" => "db672472483.db.1and1.com",
    //  "port" => 3306,
    //  "username" => "dbo672472483",
    //  "password" => "sOulm4dnessCocu",
    //  "name" => "db672472483",
    //  "table" => "users"
  ),
   "features" => array(
    "auto_init" => true 
  ),
  "pages" => array(
    "no_login" => array(
      "/",
      "/advanceERP/reset.php",
      "/advanceERP/register.php"
    ),
    "everyone" => array(
      "/advanceERP/status.php"
    ),
    "login_page" => "/advanceERP/login.php",
    "home_page" => "/advanceERP/index.php"
  )
));