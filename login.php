<?php
require "config.php";
if(isset($_POST['action_login'])){
    $identification = $_POST['login'];
    $password = $_POST['password'];
    if($identification == "" || $password == ""){
        $msg = array("Error", "Username / Password Wrong !");
    }else{
        $login = $LS->login($identification, $password, isset($_POST['remember_me']));
        if($login === false){
            $msg = array("Error", "Username / Password Wrong !");
        }else if(is_array($login) && $login['status'] == "blocked"){
            $msg = array("Error", "Too many login attempts. You can attempt login after ". $login['minutes'] ." minutes (". $login['seconds'] ." seconds)");
        }
    }
}
?>
<!doctype html>
<html class="no-js" lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href='https://fonts.googleapis.com/css?family=Roboto:400,300' rel='stylesheet' type='text/css'>
    <title>Login</title>
    <link rel="stylesheet" href="css/foundation.css" />
    <script src="js/vendor/modernizr.js"></script>
    <link href="css/style.css" rel="stylesheet" />
    <style>
        html, body {
            height: 100%;
            background:#262c31;
        }

        .main {
            height: 100%;
            width: 100%;
            display: table;
        }

        .wrapper {
            display: table-cell;
            height: 100%;
            vertical-align: middle;
        }
        #login {
            width: 30%;
        }
        @media all and (max-width:800px) {
            #login {
                width: 90%;
            }
        }
    </style>
</head>
<body>
    <div class="main">
        <div class="wrapper">
            <div id="login" class="row" style="margin: auto">
                <div class="large-12 columns text-center">
                    <img src="img/logo.png" alt="logo"/>

                    <form action="login.php" method="POST">
                    <input id="Text1" type="text" placeholder="Email or Username" name="login" class="border-radius-top" />

                    <input id="Text2" type="password" placeholder="Password" name="password" class="no-radius"  />
                    
                    <button class="button small border-radius-bottom coral-bg" style="width: 100%" name="action_login">Login</button>
                    </form>
                        <!-- REGISTER -->
                        <p>Don't have an account ?
                            <a href="register.php">Register</a>
                        </p>
                        
                        <!-- Register -->
                        <p>Forgot Your Password ?
                            <a href="reset.php">Reset Password</a>
                        </p>
                            
                    <?php
                      if(isset($msg)){
                        echo "<h2>{$msg[0]}</h2><p>{$msg[1]}</p>";
                      }
                      ?>
                </div>
            </div>

        </div>
    </div>
</body>
<script src="js/vendor/jquery.js"></script>
<script src="js/foundation.min.js"></script>

</html>

<!-- Localized -->