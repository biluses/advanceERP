<?php
    // $host_name  = "db672472483.db.1and1.com";
    // $database   = "db672472483";
    // $user_name  = "dbo672472483";
    // $password   = "sOulm4dnessCocu";

$host_name  = "localhost";
    $database   = "advance2";
    $user_name  = "root";
    $password   = "";


    $con = mysqli_connect($host_name, $user_name, $password, $database);
    
    if(mysqli_connect_errno())
    {
    echo '<p>Conexión fallida al servidor: '.mysqli_connect_error().'</p>';
    }
   
?>