<?php
require "config.php";
if( isset($_POST['newName']) ){
    $_POST['newName'] = $_POST['newName'] == "" ? "Dude" : $_POST['newName'];
    $LS->updateUser(array(
        "name" => $_POST['newName']
    ));
}
?>
<!doctype html>
<html class="no-js" lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href='https://fonts.googleapis.com/css?family=Roboto:400,300' rel='stylesheet' type='text/css'>
    <title>CSV upload</title>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>
    <link rel="stylesheet" href="css/foundation.css" />
    <link rel="stylesheet" href="css/foundation.min.css">
    <link href="https://netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">
    <link href="css/foundation-icons/foundation-icons.css" rel="stylesheet" />
    <script src="js/vendor/modernizr.js"></script>
    <link href="css/style.css" rel="stylesheet" />
    <link href="css/flat-icon/flaticon.css" rel="stylesheet" />
    <link href="css/tree.min.css" rel="stylesheet" />
    <!-- datepicker -->
        <script src="js/foundation.min.js"></script>
    <script src="js/vendor/modernizr.js"></script>
    <link rel="stylesheet" type="text/css" href="css/foundation-datepicker.min.css"><!---->
    <!-- languaje 
     FOR ENGLISH OF GB, and change script down to en-GB//   <script src="js/locales/foundation-datepicker.en-GB.js"></script>-->
    <script src="js/locales/foundation-datepicker.es.js"></script>
    <!-- date picker Foundation -->
    <script type="text/javascript" language="javascript" src="js/foundation-datepicker.js"></script><!---->
</head>
<body>
    <div class="row full-width wrapper">
        <div class="large-12 columns content-bg">
            <div id="top-menu">
                <div class="row">
                    <div class="large-2 medium-4 small-12 columns top-part-no-padding">
                        <div class="logo-bg">
                            <img src="img/logo.png" alt="logo"/>
                            <i class="fi-list toggles" data-toggle="hide"></i>
                        </div>
                    </div>
                    <div class="large-10 medium-8 small-12 columns top-menu">
                        <div class="row">
                            <div class="large-6 medium-6 small-12 columns">
                                <div class="row">
                                    <div class="large-8 columns">
                                        <input id="Text1" type="text" class="search-text" placeholder="Search" />
                                    </div>
                                </div>
                            </div>
                            <div class="large-4 medium-6 small-12 columns text-center">
                                <div class="row">
                                    <div class="medium-3 small-3 columns">
                                        <div class="notification">
                                            <i class="fi-mail"></i>
                                            <span class="mail">4</span>
                                        </div>
                                    </div>
                                    <div class="medium-3 small-3 columns">
                                        <div class="notification">
                                            <i class="fi-megaphone"></i>
                                            <span class="megaphone">5</span>
                                        </div>
                                    </div>
                                     <div class="medium-3 small-3 columns">
                                        <!--<img src="img/32.jpg" alt="picture" class="top-bar-picture" />-->
                                        Hi 
                                            <?php
                                            $details = $LS->getUser();
                                            echo $details['username'] ,"!";
                                            ?>
                                    </div>
                                    <div class="medium-3 small-3 columns">
                                       <a href="logout.php"> <i class="fi-power power-off"></i></a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="clearfix"></div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="no-padding">
                    <div class="large-2 medium-12 small-12 columns">
                        <ul class="side-nav">
                             <li><a href="index.php"><i class="flaticon-dashboard1"></i>Dashboard</a></li>
                            <li class="active"><a href="upload.php"><i class="flaticon-add58"></i>Upload CSV</a></li>
                            <li><a href="incomes.php"><i class="flaticon-invoice1"></i>Incomes</a></li>
                        </ul>
                    </div>
                </div>
                <div class="large-10 medium-12 small-12 columns light-grey-bg-pattern">
                    <div class="row">
                        <div class="large-10 columns">
                            <div class="page-name">
                                <div class="clearfix"></div>
                            </div>
                        </div>
                    </div>
                    <div id="form">
                        <div class="row">
                            <div class="large-12 columns">
                                <div class="custom-panel">
                                    <div class="custom-panel-heading">
                                        <h4>CSV UPLOAD</h4>
                                    </div>
                                    <div class="custom-panel-body">
    	                                   <form enctype="multipart/form-data" method="post" action="">
                                                <p><strong>Import CSV file</strong></p>
                                             
                                                CSV File:<input type="file" name="file" id="file">
                                         
                                               <input type="submit" class="button tiny radius right coral-bg" name="submit" value="submit">
                                               <div class="row collapse date" id="dpMonths" data-date-format="yyyy-mm-dd" data-start-view="year" data-min-view="year" style="max-width:200px;">
                            <div class="small-2 columns">   
                                <span class="prefix"><i class="fa fa-calendar"></i></span>
                            </div>
                            <div class="small-10 columns">
                                <input type="text" size="16" value="" id="min" name="min" >  
                            </div>
                        </div>
                                            </form>
                                        <div class="clearfix">
                                            <?PHP
                                            if(isset($_POST["submit"]))
                                            {
                                                $fecha = $_POST['min'];;
                                                // Connect to the MySQL server and select the corporate database
                                                include('conect.php');
                                                //document name and extension.
                                                $filename=$_FILES["file"]["name"];
                                                //save on temporal
                                                $filename2=$_FILES['file']['tmp_name'];
                                                //get extension
                                                $ext=substr($filename,strrpos($filename,"."),(strlen($filename)-strrpos($filename,".")));

                                                //we check,file must have .csv extention
                                                if($ext==".csv" && $fecha!="")
                                                {
                                                    // Open and parse the sales.csv file
                                                    $file = fopen($filename2, "r");
                                                    while ($emapData = fgetcsv($file, 10000, ";")) 
                                                    {
                                                        //check if advertiser exists
                                                        $sqlInfo = "SELECT id FROM advertisers WHERE nombre LIKE '$emapData[0]'";
                                                        $result = $con->query($sqlInfo);
                                                        //IF YES
                                                        if(mysqli_num_rows($result) > 0 )
                                                        { 
                                                            //OPTION ADVERTISER EXIST
                                                            while($row = $result->fetch_assoc()) 
                                                            {
                                                                //insert on Incomes
                                                                $sqlIncomes = "INSERT INTO incomes(id,advertiser,conversion,revenue,date) VALUES ('','".$row['id']."','$emapData[1]','$emapData[2]','$fecha')";
                                                                //echo "Si existe: ".$sqlIncomes."<br>";
                                                                $insertIncome = $con->query($sqlIncomes);
                                                            }
                                                        }
                                                        else //if not exists first create the advertiser and insert on incomes with the new ID
                                                        {
                                                            $queryNewAdv = "INSERT INTO advertisers VALUES ('', '$emapData[0]', 'Camilla Rolando')";
                                                            $insertAdv = $con->query($queryNewAdv);
                                                            $NewID = $con->insert_id;
                                                            $sqlIncomes = "INSERT INTO incomes(id,advertiser,am,conversion,revenue,date) VALUES ('','$NewID','0','$emapData[1]','$emapData[2]','$fecha')";
                                                            $insertIncome = $con->query($sqlIncomes);
                                                        }
                                                        
                                                    }
                                                    fclose($file);
                                                         echo "<span style='color:green; font-size:20px;'>CSV File has been successfully Imported.</span>";
                                                }
                                                else if($ext!=".csv"){
                                                    echo "<span style='color:red; font-size:20px;'>Error: Please Upload only CSV File</span>";
                                                }
                                                else if($fecha==""){
                                                    echo "<span style='color:red; font-size:20px;'>Error: Please select a date</span>";
                                                }

                                                $con->close();
                                            }
                                            ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="js/menu.js"></script>
    <script>
        $(document).foundation();
    </script>  
    <script>
   $(function () {
        // datepicker limited to months
        $('#dpMonths').fdatepicker();

    });
    </script>  
</body>
</html>

<!-- Localized -->