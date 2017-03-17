<?php
include "config.php";
?>
<!doctype html>
<html class="no-js" lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href='http://fonts.googleapis.com/css?family=Roboto:400,300' rel='stylesheet' type='text/css'>
    <title>Register</title>
    <link rel="stylesheet" href="css/foundation.css" />
    <script src="js/vendor/modernizr.js"></script>
    <link href="css/style.css" rel="stylesheet" />
    <style>
        html, body {
            height: 100%;
            background:#262c31  ;
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
                    <img src="img/logo.png" alt="logo" />

                    <form action="register.php" method="POST">

                    <input id="Text4" type="text" placeholder="Username" name="username" class="border-radius-top" />
                    <input id="Text1" type="text" placeholder="Email" name="email"  class="border-radius-top" />
                    <input id="Text2" type="password" placeholder="Password" name="pass" class="no-radius"  />
                    <input id="Text3" type="password" placeholder="Confirm Password" name="retyped_password" class="no-radius"  />
                    <input id="Text5" type="text" placeholder="Name" name="name" class="border-radius-top" />

                    <button class="button small border-radius-bottom coral-bg" style="width: 100%" name="submit">Register</button>
                    </form>
                    <a href="login.php">Back to Login</a>
                     <?php
      if( isset($_POST['submit']) ){
        $username = $_POST['username'];
        $email = $_POST['email'];
        $password = $_POST['pass'];
        $retyped_password = $_POST['retyped_password'];
        $name = $_POST['name'];
        if( $username == "" || $email == "" || $password == '' || $retyped_password == '' || $name == '' ){
            echo "<h2>Fields Left Blank</h2>", "<p>Some Fields were left blank. Please fill up all fields.</p>";
        }elseif( !$LS->validEmail($email) ){
            echo "<h2>E-Mail Is Not Valid</h2>", "<p>The E-Mail you gave is not valid</p>";
        }elseif( !ctype_alnum($username) ){
            echo "<h2>Invalid Username</h2>", "<p>The Username is not valid. Only ALPHANUMERIC characters are allowed and shouldn't exceed 10 characters.</p>";
        }elseif($password != $retyped_password){
            echo "<h2>Passwords Don't Match</h2>", "<p>The Passwords you entered didn't match</p>";
        }else{
          $createAccount = $LS->register($username, $password,
            array(
              "email" => $email,
              "name" => $name,
              "created" => date("Y-m-d H:i:s") // Just for testing
            )
          );
          if($createAccount === "exists"){
            echo "<label>User Exists.</label>";
          }elseif($createAccount === true){
            echo "<label>Success. Created account. <a href='login.php'>Log In</a></label>";
          }
        }
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