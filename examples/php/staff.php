<?php

/*
 * Example PHP implementation used for the index.html example
 */

// DataTables PHP library
include( "../../php/DataTables.php" );

// Alias Editor classes so they are easy to use
use
	DataTables\Editor,
	DataTables\Editor\Field,
	DataTables\Editor\Format,
	DataTables\Editor\Mjoin,
	DataTables\Editor\Options,
	DataTables\Editor\Upload,
	DataTables\Editor\Validate;

// Build our Editor instance and process the data coming from _POST
Editor::inst( $db, 'incomes', 'id' )
	->fields(
		Field::inst( 'incomes.advertiser' )
			 ->options( Options::inst()
                ->table( 'advertisers' )
                ->value( 'id' )
                ->label( 'nombre' )
            )
            ->validator( 'Validate::dbValues' ),
        Field::inst( 'advertisers.nombre' ),
       	Field::inst( 'incomes.am' )
			 ->options( Options::inst()
                ->table( 'advertisers' )
                ->value( 'id' )
                ->label( 'id_am' )
            )
            ->validator( 'Validate::dbValues' ),
        Field::inst( 'advertisers.id_am' ),
		Field::inst( 'incomes.clicks' )
			->validator( 'Validate::numeric' )
            ->setFormatter( 'Format::ifEmpty', null ),
		Field::inst( 'incomes.conversion' )
			->validator( 'Validate::numeric' )
            ->setFormatter( 'Format::ifEmpty', null ),
		Field::inst( 'incomes.revenue' )
			->validator( 'Validate::numeric' )
            ->setFormatter( 'Format::ifEmpty', null ),
		Field::inst( 'incomes.platform_revenue' )
			->validator( 'Validate::numeric' )
            ->setFormatter( 'Format::ifEmpty', null ),
		Field::inst( 'incomes.difference' )
			->validator( 'Validate::numeric' )
            ->setFormatter( 'Format::ifEmpty', null ),
		Field::inst( 'incomes.scrubs' )
			->validator( 'Validate::numeric' )
            ->setFormatter( 'Format::ifEmpty', null ),
		Field::inst( 'incomes.hold' )
			->validator( 'Validate::numeric' )
            ->setFormatter( 'Format::ifEmpty', null ),
		Field::inst( 'incomes.validated' )
			->validator( 'Validate::numeric' )
            ->setFormatter( 'Format::ifEmpty', null ),
		Field::inst( 'incomes.status' )
			 ->options( Options::inst()
                ->table( 'status' )
                ->value( 'id' )
                ->label( 'name' )
            )
            ->validator( 'Validate::dbValues' ),
        Field::inst( 'status.name' ),
		Field::inst( 'incomes.notas_am' ),
		Field::inst( 'incomes.notas_finance' ),
		Field::inst( 'incomes.date' )
			  //->getFormatter( 'Format::date_sql_to_format', 'Ymd' )
			  //->setFormatter( 'Format::date_format_to_sql', 'Ymd' )
	)
	//->leftJoin( 'advertisers', 'advertisers.id', '=', 'incomes.advertisers' )
	->leftJoin( 'advertisers', 'advertisers.id', '=', 'incomes.advertiser' )
	->leftJoin( 'status', 'status.id', '=', 'incomes.status' )
	->process( $_POST )
	->json();


