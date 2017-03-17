<?php
//require_once('include/util.php');
$advid = $_POST['advid'];
$rev = $_POST['rev'];
$date = $_POST['date'];
$diff = $_POST['diff'];
include('../conect.php');
$sql="UPDATE `incomes` SET `difference`='$diff' where advertiser='$advid' AND revenue='$rev' AND date='$date'";
mysqli_query($con,$sql);
mysqli_close($con);
?>