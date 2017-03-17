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
    <title>INCOMES</title>
    <!-- CSS -->
    <link rel="stylesheet" href="css/foundation.css" />
    <link rel="stylesheet" href="css/foundation.min.css"><!---->
    <link href="css/foundation-icons/foundation-icons.css" rel="stylesheet" />
    <link href="https://netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet" />
    <link href="css/flat-icon/flaticon.css" rel="stylesheet" />
        <!-- data tables -->
        <link rel="stylesheet" type="text/css" href="css/csstables/jquery.dataTables.min.css">
        <link rel="stylesheet" type="text/css" href="css/csstables/responsive.dataTables.min.css">
        <link rel="stylesheet" type="text/css" href="css/csstables/buttons.dataTables.min.css">
        <link rel="stylesheet" type="text/css" href="css/csstables/select.dataTables.min.css">
        <link rel="stylesheet" type="text/css" href="css/csstables/editor.dataTables.min.css">
        <link rel="stylesheet" type="text/css" href="examples/resources/syntax/shCore.css">
        <link rel="stylesheet" type="text/css" href="examples/resources/demo.css">
    <!-- datepicker -->
    <link rel="stylesheet" type="text/css" href="css/foundation-datepicker.min.css"><!---->
    <!-- languaje 
     FOR ENGLISH OF GB, and change script down to en-GB//   <script src="js/locales/foundation-datepicker.en-GB.js"></script>-->
    <script src="js/locales/foundation-datepicker.es.js"></script>
 

    <style type="text/css" class="init">
        .results {
            font-weight: bold;
            color: #33cc66;
        }
        .results_bad {
            font-weight: bold;
            color: #ff3333;
        }
        .fact-emitidas {
            background-color: #99ff99 !important;
        }
        .fact-pendiente {
            background-color: #ffff99 !important;
        }
        .fact-faltandatos {
            background-color: #ffe6b3 !important;
        }
        .fact-brasil {
            background-color: #ff9999 !important;
        }
        .fact-sinvalidar {
            background-color: #ffb3ec !important;
        }
        td.highlight {
            background-color: whitesmoke !important;
        }
    </style>
    <!-- JS -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>
    <script src="js/foundation.min.js"></script>
    <script src="js/vendor/modernizr.js"></script>
        <!-- date picker Foundation -->
        <script type="text/javascript" language="javascript" src="js/foundation-datepicker.js"></script><!---->
        <!-- dta tables -->
        <script type="text/javascript" language="javascript" src="js/jstables/jquery.dataTables.min.js"></script>
        <script type="text/javascript" language="javascript" src="js/jstables/dataTables.responsive.min.js"></script>
        <script type="text/javascript" language="javascript" src="js/jstables/dataTables.buttons.min.js"></script>
        <script type="text/javascript" language="javascript" src="js/jstables/dataTables.select.min.js"></script>
        <script type="text/javascript" language="javascript" src="js/jstables/dataTables.editor.min.js"></script>
        <script type="text/javascript" language="javascript" src="examples/resources/syntax/shCore.js"></script>
        <script type="text/javascript" language="javascript" src="examples/resources/demo.js"></script>
        
        <!-- EXPORT BUTTON -->
        <script type="text/javascript" language="javascript" src="js/jstables/jszip.min.js"></script>
        <script type="text/javascript" language="javascript" src="js/jstables/pdfmake.min.js"></script>
        <script type="text/javascript" language="javascript" src="js/jstables/vfs_fonts.js"></script>
        <script type="text/javascript" language="javascript" src="js/jstables/buttons.html5.min.js"></script>
        <script type="text/javascript" language="javascript" src="js/jstables/buttons.print.min.js"></script>
        <!-- END EXPORT BUTTON -->

        <script type="text/javascript" language="javascript" class="init">  
    var editor; // use a global for the submit and return data rendering in the examples
$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
        // get value
        var searchDate = $('#min').val();
        // remove "-"
        var stringDate = searchDate.split("-");
        // concatenate array of values
        var year = stringDate[0];
        var month = stringDate[1];
        var day = stringDate[2];
        var dateSplited = year+month+day;
        // parse to float
        var min = parseFloat(dateSplited);
        // console.log(min);
        //var max = parseInt( $('#max').val(), 10 );
         // get value
        var currentDate = data[13] || 0;
        // remove "-"
        var splitedCurrentDate = currentDate.split("-");
        // concatenate array of values
        var yearCurrent = splitedCurrentDate[0];
        var monthCurrent = splitedCurrentDate[1];
        var dayCurrent = splitedCurrentDate[2];
        var currentDsplited = yearCurrent+monthCurrent+dayCurrent;
        // parse to float
        var date = parseFloat(currentDsplited);
        // var date = parseFloat( data[13] ) || 0; // use data for the date column
        // console.log(date);
        if ( ( isNaN( min ) ) ||( min == date  ) )
        {
            return true;    
        }
        return false;
    }
);
    $(document).ready(function() {

        editor = new $.fn.dataTable.Editor({
            ajax: "examples/php/staff.php",
            table: "#example",
            fields: [ {
                    label: "Advertiser:",
                    name: "incomes.advertiser",
                    type: "select"
                }, {
                    label: "AM:",
                    name: "incomes.am",
                    type: "select"
                },{
                    label: "Clicks:",
                    name: "incomes.clicks"
                }, {
                    label: "Conv:",
                    name: "incomes.conversion"
                }, {
                    label: "Revenue:",
                    name: "incomes.revenue"
                }, {
                    label: "Start date:",
                    name: "incomes.date",
                    type: "datetime"
                }, {
                    label: "Platform Adv:",
                    name: "incomes.platform_revenue"
                }, {
                    label: "Scrubs:",
                    name: "incomes.scrubs"
                }, {
                    label: "Hold:",
                    name: "incomes.hold"
                }, {
                    label: "Difference:",
                    name: "incomes.difference"
                }, {
                    label: "Validated:",
                    name: "incomes.validated"
                }, {
                    label: "Status:",
                    name: "incomes.status",
                    type: "select"
                }, {
                    label: "Notas AM:",
                    name: "incomes.notas_am"
                }, {
                    label: "Notas Finance:",
                    name: "incomes.notas_finance"
                }
            ]
        } ),

    // Activate an inline edit on click of a table cell
    // or a DataTables Responsive data cell
    $('#example').on( 'click', 'tbody td:not(.child), tbody span.dtr-data', function (e) {
        // Ignore the Responsive control and checkbox columns
        if ( $(this).hasClass( 'control' ) || $(this).hasClass('select-checkbox') ) {
            return;
        }

        editor.inline( this );
    } ),



 $('#example').DataTable({
    initComplete: function () {
            this.api().columns([3]).every( function () {
                var column = this;
                var select = $('<select><option value=""></option></select>')
                    .appendTo( $(column.footer()).empty() )
                    .on( 'change', function () {
                        var val = $.fn.dataTable.util.escapeRegex(
                            $(this).val()
                        );
 
                        column
                            .search( val ? '^'+val+'$' : '', true, false )
                            .draw();
                    } );
 
                column.data().unique().sort().each( function ( d, j ) {
                    if(column.search() === '^'+d+'$'){
                        select.append( '<option value="'+d+'" selected="selected">'+d+'</option>' )
                    } else {
                        select.append( '<option value="'+d+'">'+d+'</option>' )
                    }
                } );
            } );
        },
    // colors depending on status
     "createdRow": function( row, data, dataIndex ) {
        switch (data.incomes.status) {
            case "1":
                 $(row).addClass( 'fact-emitidas' );
                break;
            case "2":
                 $(row).addClass( 'fact-pendiente' );
                break;
            case "3":
                 $(row).addClass( 'fact-faltandatos' );
                break;
            case "4":
                 $(row).addClass( 'fact-brasil' );
                break;
            case "5":
                 $(row).addClass( 'fact-sinvalidar' );
                break;
        }
       
        //autoset difference
        // if ( ((data.incomes.revenue.replace(/[\$,]/g, '') * 1 >= 0)&&(data.incomes.platform_revenue.replace(/[\$,]/g, '') * 1 >= 0)) ) 
        // {

        if ( (data.incomes.platform_revenue.replace(/[\$,]/g, '') * 1 > 0) ) 
        {
                
                 

                 var revenueValue = data.incomes.revenue.replace(/[\$,]/g, '') * 1;
                 var platformValue = data.incomes.platform_revenue.replace(/[\$,]/g, '') * 1;
                 var datetime = data.incomes.date;
                 var advertiser = data.incomes.advertiser;
                 var result = platformValue - revenueValue;
                 // $('td', row).eq(8).html(result);



                 $.ajax({
                    type: "POST",
                    url: "php/diff_update.php",
                    data: {
                            advid: advertiser,
                            rev: revenueValue,
                            date: datetime,
                            diff: result
                        },
                    success: function(data) {
                        console.log('success');
                       var tableRefresh = $('#example').DataTable();
                        var rows = tableRefresh
                            .draw();
                    }
                });
            }

             // difference negative
         if ( data.incomes.difference.replace(/[\$,]/g, '') * 1 < 0 ) {
                 $('td', row).eq(8).addClass('fa fa-exclamation');
            }
        },

         "footerCallback": function ( row, data, start, end, display ) {
            var api = this.api(), data;

            // Remove the formatting to get integer data for summation
            var intVal = function ( i ) {
                return typeof i === 'string' ?
                    i.replace(/[\$,]/g, '')*1 :
                    typeof i === 'number' ?
                        i : 0;
            },
            // Total over all pages
            revenue = api
                .column( 6, { page: 'current'} )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );
 
            platforms = api
                .column( 7, { page: 'current'} )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );
 
            differences = api
                .column( 8, { page: 'current'} )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );

             scrubs = api
                .column( 9, { page: 'current'} )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );

             holds = api
                .column( 10, { page: 'current'} )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );

             validates = api
                .column( 11, { page: 'current'} )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );


            // Update footer
            $( api.column( 6 ).footer() ).html(
                '<span class="results">$'+(revenue).toFixed(2)+'</span>'
            );
            $( api.column( 7 ).footer() ).html(
                '<span class="results">$'+(platforms).toFixed(2)+'</span>'
            );
            $( api.column( 8 ).footer() ).html(
                '<span class="results_bad">$'+(differences).toFixed(2)+'</span>'
            );
            $( api.column( 9 ).footer() ).html(
                '<span class="results_bad">$'+(scrubs).toFixed(2)+'</span>'
            );
            $( api.column( 10 ).footer() ).html(
                '<span class="results_bad">$'+(holds).toFixed(2)+'</span>'
            );
            $( api.column( 11 ).footer() ).html(
                '<span class="results">$'+(validates).toFixed(2)+'</span>'
            );
        },
         
        responsive: true,
        bPaginate: false, 
        dom: "Bfrtip",
        ajax: "examples/php/staff.php",
        columns: [
            {   // Responsive control column
                data: null,
                defaultContent: '',
                className: 'control',
                orderable: false
            },
            {   // Checkbox select column
                data: null,
                defaultContent: '',
                className: 'select-checkbox',
                orderable: false
            },

            { data: "advertisers.nombre" },
            { data: "advertisers.id_am" },
            { data: "incomes.clicks" },
            { data: "incomes.conversion" },
            { data: "incomes.revenue" , render: $.fn.dataTable.render.number( ',', '.', 2, '$' ) },
            { data: "incomes.platform_revenue" , render: $.fn.dataTable.render.number( ',', '.', 2, '$' ) },
            { data: "incomes.difference" , render: $.fn.dataTable.render.number( ',', '.', 2, '$' ) },
            { data: "incomes.scrubs" , render: $.fn.dataTable.render.number( ',', '.', 2, '$' ) },
            { data: "incomes.hold" , render: $.fn.dataTable.render.number( ',', '.', 2, '$' ) },
            { data: "incomes.validated", render: $.fn.dataTable.render.number( ',', '.', 2, '$' ) },
            { data: "status.name" },
            { data: "incomes.date" },
            { data: "incomes.notas_am" },
            { data: "incomes.notas_finance" }
        ],
        order: [ 2, 'asc' ],
        select: {
            style:    'os',
            selector: 'td.select-checkbox'
        },
        buttons: [
            { extend: "create", editor: editor },
            { extend: "edit",   editor: editor },
            { extend: "remove", editor: editor },
            {
                extend: 'collection',
                text: 'Export',
                buttons: [
                    'copy',
                    'excel',
                    'csv',
                    'pdf',
                    'print'
                ]
            }
        ],
        
         
    });

 $('#min').change( function() {
        table.draw();
    } );
// highlights table
  var table = $('#example').DataTable();
    $('#example tbody')
        .on( 'mouseenter', 'td', function () {
            // var colIdx = table.cell(this).index().column;
 
            // $( table.cells().nodes() ).removeClass( 'highlight' );
            // $( table.column( colIdx ).nodes() ).addClass( 'highlight' );
        } );
$('#example tbody').on( 'click', 'td', function () {
     //var first = this.innerHTML;
     //alert( 'Clicked on: '+first );
    // var second = this.innerHTML;
    // alert( 'Clicked on: '+first+' clicked on second: '+second );
   //console.log(this); /*.addClass( 'red' );*/



// var revenueValue = data.incomes.revenue.replace(/[\$,]/g, '') * 1;
//                  var platformValue = data.incomes.platform_revenue.replace(/[\$,]/g, '') * 1;
//                  var datetime = data.incomes.date;
//                  var advertiser = data.incomes.advertiser;
//                  var result = platformValue - revenueValue;
//                  // $('td', row).eq(8).html(result);



//                  $.ajax({
//                     type: "POST",
//                     url: "php/diff_update.php",
//                     data: {
//                             advid: advertiser,
//                             rev: revenueValue,
//                             date: datetime,
//                             diff: result
//                         },
//                     success: function(data) {
//                         console.log('success');
//                        var tableRefresh = $('#example').DataTable();
//                         var rows = tableRefresh
//                             .rows()
//                             //.remove()
//                             .draw();
//                     }
//                 });


} )
      
    // Event listener to the two range filtering inputs to redraw on input
   // $('#min, #max').keyup( function() {
   //     table.draw();
   // } );
   



});
    </script>

</head>
<body>
    <div class="row full-width wrapper">
        <div class="large-12 columns">
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
                            <li><a href="upload.php"><i class="flaticon-add58"></i>Upload CSV</a></li>
                            <li class="active"><a href="incomes.php"><i class="flaticon-invoice1"></i>Incomes</a></li>
                           <!-- <li><a href="profile.html"><i class="flaticon-profile4"></i>Profile</a></li>
                            <li><a href="inbox.html"><span class="flaticon-mailbox10"></span>Inbox</a></li>
                            <li><a href="invoice.html"><i class="flaticon-invoice1"></i>Invoice</a></li>
                            <li>
                                <ul>
                                    <li>
                                        <dl class="accordion" data-accordion="myAccordionGroup">
                                            <dd>
                                                <a href="#panel1c"><i class="flaticon-forms"></i>Components</a>
                                                <div id="panel1c" class="content">
                                                    <ul>
                                                        <li>
                                                            <a href="general.html">General</a>
                                                        </li>
                                                        <li>
                                                            <a href="wizard.html">Wizard</a>
                                                        </li>
                                                        <li>
                                                            <a href="editor.html">Wysiwug Editor</a>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </dd>
                                        </dl>
                                    </li>
                                </ul>
                            </li>
                            <li><a href="login.html"><i class="flaticon-incoming4"></i>Login</a></li>
                            <li><a href="register.html"><i class="flaticon-add58"></i>Register</a></li>
                            <li><a href="pricing.html"><i class="flaticon-businessman63"></i>Pricing</a></li>-->
                        </ul>
                    </div>
                </div>
                <div class="large-10 medium-12 small-12 columns light-grey-bg-pattern">
                    <div class="row">
                        <div class="large-10 columns">
                            <div class="page-name">
                                <h3 class="left">INCOMES</h3>
                                <div class="clearfix"></div>
                            </div>
                        </div>

                    </div>
                    <!-- tables -->
                    <div id="staff">
                         <div class="row collapse date" id="dpMonths" data-date-format="yyyy-mm-dd" data-start-view="year" data-min-view="year" style="max-width:200px;">
                            <div class="small-2 columns">   
                                <span class="prefix"><i class="fa fa-calendar"></i></span>
                            </div>
                            <div class="small-10 columns">
                                <input type="text" size="16" value="" id="min" name="min" >  
                            </div>
                        </div>
                        <table id="example" class="display responsive" cellspacing="0" width="100%">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th></th>
                                    <th>Advert</th>
                                    <th>AM</th>
                                    <th>clicks</th>
                                    <th>Conv</th>
                                    <th>Revenue</th>
                                    <th>Platf.Adv</th>
                                    <th>Diff</th>
                                    <th>Scrubs</th>
                                    <th>Hold</th>
                                    <th>Validated</th>
                                    <th>Status</th>
                                    <th>date</th>
                                    <th>Notas(AM)</th>
                                    <th>Notas(Finance)</th>
                            
                                </tr>
                            </thead>
                            <tfoot>
                                <tr>
                                    <th></th>
                                    <th></th>
                                    <th colspan="2"></th>
                                    <th style="text-align:left">Total:</th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th style="display: none;"></th>
                                    <th></th>
                                    <th></th>
                                
                                </tr>
                                <tr>
                                    <th></th>
                                    <th></th>
                                    <th>Advert</th>
                                    <th>AM</th>
                                    <th>clicks</th>
                                    <th>Conv</th>
                                    <th>Revenue</th>
                                    <th>Platf.Adv</th>
                                    <th>Diff</th>
                                    <th>Scrubs</th>
                                    <th>Hold</th>
                                    <th>Validated</th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th style="display: none;"></th>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <!-- end tables -->
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