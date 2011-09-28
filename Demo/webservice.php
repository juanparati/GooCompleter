<?php
	
	// Get database path
	$dbpath = dirname(__FILE__).DIRECTORY_SEPARATOR.'countries.s3db';
	
	// Sanitize $_POST
	$search = filter_var($_POST['search'], FILTER_SANITIZE_STRING).'%';
	 
	// Open the database
	$db = new PDO("sqlite:$dbpath");
	
	// Query
	$query = $db->prepare("SELECT country FROM countries WHERE country LIKE :country");
	$query->bindParam(':country', $search, PDO::PARAM_STR); // Recommended for prevent SQL Injection
	$query->execute();
	
	// Returns the indicated 0-indexed column
	$result = $query->fetchAll(PDO::FETCH_COLUMN);		

	// Close PDO connection
	$db = NULL;
	
	// Send results
	header('Cache-Control: no-cache, must-revalidate');
	header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
	header('Content-type: application/json');
	echo json_encode($result);
				
?>