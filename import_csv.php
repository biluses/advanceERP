<?PHP
if(isset($_POST["submit"]))
{
    // Connect to the MySQL server and select the corporate database
    $con = new mysqli("localhost","root","","advance2");
    //document name and extension.
    echo $filename=$_FILES["file"]["name"];
    //save on temporal
    echo $filename2=$_FILES['file']['tmp_name'];
    //get extension
	$ext=substr($filename,strrpos($filename,"."),(strlen($filename)-strrpos($filename,".")));

    //we check,file must have .csv extention
	if($ext==".csv")
	{
		// Open and parse the sales.csv file
	    $file = fopen($filename2, "r");
	    while ($emapData = fgetcsv($file, 10000, ";")) 
		{

         	$sqlInfo = "SELECT id FROM advertisers WHERE nombre LIKE '$emapData[0]'";
         	$result = $con->query($sqlInfo);
         	if(mysqli_num_rows($result) > 0 )
         	{ 
         		while($row = $result->fetch_assoc()) 
         		{
         			echo "--------------existe el advertiser: " .$emapData[0] ." con ID: ".$row["id"]."-----------------<br>";
         			$sqlIncomes = "INSERT INTO incomes(id,advertiser,conversion,revenue,date) VALUES ('','".$row['id']."','$emapData[1]','$emapData[2]','$emapData[3]')";
         			$insertIncome = $con->query($sqlIncomes);
         			echo $sqlIncomes."<br>";

    			}
         	}
         	else
         	{
         		echo "-----------------NO existe el advertiser: " .$emapData[0] ."-----------------------<br>";
         		$queryNewAdv = "INSERT INTO advertisers VALUES ('', '$emapData[0]', '')";
				$insertAdv = $con->query($queryNewAdv);
				$NewID = $con->insert_id;
				echo "Advertiser inserted with the new id: ". $NewID ."<br>";
				echo "insertando...<br>"; 	
				$sqlIncomes = "INSERT INTO incomes(id,advertiser,conversion,revenue,date) VALUES ('','$NewID','$emapData[1]','$emapData[2]','$emapData[3]')";
				$insertIncome = $con->query($sqlIncomes);
         	}
	        
	    }
	    fclose($file);
	         echo "CSV File has been successfully Imported.";
	}
	else {
	    echo "Error: Please Upload only CSV File";
	}

    $con->close();
}
?>