/**
 * Created by kelvin on 7/26/16.
 */
var mainController  = angular.module('createScoreCardController',[]);

mainController.controller('createScoreCardController',['$scope','$timeout','$translate','$anchorScroll','Paginator','$filter',
    '$http','CustomFormService','DHIS2URL','indicatorGroupManager','$location',function($scope,
                                                    $timeout,
                                                    $translate,
                                                    $anchorScroll,
                                                    Paginator,
                                                    $filter,
                                                    $http,
                                                    CustomFormService,
                                                    DHIS2URL,
                                                    indicatorGroupManager,
                                                    $location
    ){

        $scope.current_indicator_holder_position_group_position = 0;
        $scope.current_indicator_holder_position = 0;
        $scope.current_indicator=null;

        $scope.score_card = {};
        $scope.score_card.orgunit_settings={
            "parent":"USER_ORGUNIT",
            "level":"LEVEL-2"
        };
        $scope.period_settins= {
            "default_type" : "QUARTERLY",
            "start_period":"LAST"
        }
        
        $scope.score_card.show_score=false;
        $scope.score_card.show_rank=false;
        $scope.score_card.rank_position_last=true;
        
        $scope.score_card.header={
            "title":null,
            "sub_title":null,
            "description":null,
            "show_arrows_definition":true,
            "show_legend_definition":true,
            "template":{
                "display":"true",
                "content":"<div class='row'><div style='width:190px; float: left;' class='pull-left'><img style='height: 90px; width: 80px' src='https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Coat_of_arms_of_Tanzania.svg/85px-Coat_of_arms_of_Tanzania.svg.png'></div><div class='' style='text-align: center;width:760px; float: left;'><h1>{{ reportDimensions.orgUnit.name | uppercase }} <b>RMNCH</b> SCORECARD</h1><h3>{{ periodName }}</h3></div><div style='width:190px; float: left;' class='pull-right'><img style='height: 90px; width: 100px' class='pull-right' src='https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Flag_of_Tanzania.svg/125px-Flag_of_Tanzania.svg.png'></div></div>"
            }
        };
        $scope.makeid = function()
        {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            for( var i=0; i < 11; i++ )
                text += possible.charAt(Math.floor(Math.random() * possible.length));

            return text;
        };
        
        $scope.score_card.legendset_definitions=[
            {
                color: "#0F7F11",
                definition: "Target achieved / on track"
            },
            {
                color: "#FFFD38",
                definition: "Progress, but more effort required"
            },
            {
                color: "#FD0C1C",
                definition: "Not on track"
            },
            {
                color: "#D3D3D3",
                definition: "N/A"
            },
            {
                color: "#FFFFFF",
                definition: "No data"
            }


        ];
        //Add any color you know
        $scope.addLegendDefinition=function(){
            $scope.score_card.legendset_definitions.push($scope.score_card.legendset_definitions);
        };
        //delete one added colour
        $scope.removeLegendDefinition=function (index) {
            $scope.score_card.legendset_definitions.splice(index,1);

        }


        $scope.getDefitionColor = function(legend,searchKey){
            var color = {};
           angular.forEach(legend,function(value,key){
              if(key == searchKey){
                  color = value;
              }
           });
            return color;
        };

        $scope.score_card.highlighted_indicators={
            "display":false,
            definitions:[]
        };
        
        $scope.score_card.data_settings={};
        $scope.score_card.data_settings.indicator_holders=[
            {
                "holder_id":$scope.makeid(),
                "holder_position":0,
                "indicators":[]
            }
        ];
        $scope.score_card.data_settings.indicator_holder_groups=[
            {
                "name":null,
                "indicator_holder_ids":[1],
                "background_color":"#ffffff",
                "holder_style":null
            }
        ];

        $scope.score_card.additional_labels = [
            {
                "id":"source",
                "name":"Source"
            }
        ];
        
        $scope.score_card.footer={
            "display_generated_date":false,
            "display_title":false,
            "sub_title":null,
            "description":null,
            "template":null
        };


        $scope.loading = false;
        $scope.indicatorGroups = [];

        $scope.lowPicker = {
            poor: '',
            good: '',
            best: '',
            no_value: ''
        };

        $scope.get_indicator_holder_by_id =function(indicator_holder_id) {
            var selected_indicator_holder=null;
            console.log($scope.score_card.data_settings.indicator_holders);
            $scope.score_card.data_settings.indicator_holders.forEach(function(indicator_holder){
                if(indicator_holder.holder_id==indicator_holder_id) {
                    selected_indicator_holder=indicator_holder;
                }
            });
            return selected_indicator_holder;
        };

        $scope.highlight_indicator_holder_group_and_update_selections = function(indicator_holder_group){
            $scope.score_card.data_settings.indicator_holder_groups.forEach(function(indicataor_holder_group_object,objectIndex) {
                if(indicataor_holder_group_object==indicator_holder_group) $scope.current_indicator_holder_position_group_position=objectIndex;
                console.log('object holder group index is:'+objectIndex);
            });
            //Use indicator group label to gray
            $(".indicator_holder_group-"+indicator_holder_group.name).css("background-color","rgba(0,0,0,0.1)");
            $(".indicator_holder_group_selection_area").css("background-color","rgba(0,0,0,0.1)");
            //Initialize current selelection for holder group and holder

            if(angular.isUndefined($scope.current_indicator_holder_position) && indicator_holder_group.indicator_holder_ids.length>0) {
                $scope.current_indicator_holder_position = 0;
            }
            //Always update lower selection with indicator group change.
        };

        //Initialize
        $(".indicator_holder_group-null").css("background-color","rgba(0,0,0,0.1)");
        $(".indicator_holder_group_selection_area").css("background-color","rgba(0,0,0,0.1)");
        $scope.highlight_indicator_holder_group_and_update_selections($scope.score_card.data_settings.indicator_holder_groups[0]);


        $scope.list_indicator_holder_group_classes = function(indicator_holder) {
            //Generate list of holder group clasases from all groups that have this holder
            var class_list='';
            angular.forEach($scope.score_card.data_settings.indicator_holder_groups,function(indicator_holder_group){
                //Check if indicator_holder belong to this group, if so, add to class list;
                indicator_holder_group.indicator_holder_ids.forEach(function(holder_group_indicator_holder_id) {
                   if(holder_group_indicator_holder_id==indicator_holder.holder_id) {
                       class_list+=' indicator_holder_group-'+indicator_holder_group.name;
                   }
                });
            });
            return class_list;
        };
        $scope.indicator_holder_label = function(indicator_holder) {
            var holder_label=null;
            if(indicator_holder.indicators.length<1) {
                holder_label="No selection yet";
            }else {
                var indicators_count=0;
                indicator_holder.indicators.forEach(function(indicator){
                    if(indicators_count==0) {
                        holder_label=indicator.title;
                        indicators_count+=1;
                    }else {
                        holder_label+="/"+indicator.title;
                    }
                })
            }
            $scope.holderLabel=holder_label;
            return holder_label;
        };

        $scope.updateIndicatorDataElementReportingList = function() {
            if($scope.score_card.indicator_dataElement_reporting_rate_selection=="Indicators") {
                indicatorGroupManager.loadAllIndicatorGroup().then(function(indicatorGroups){
                    $scope.indicatorGroups = indicatorGroups;
                    $scope.itemGroupSelection=indicatorGroups;
                    $(".dataElementsIndicatorsFilter").css("display","block");
                });
            }else if($scope.score_card.indicator_dataElement_reporting_rate_selection=="DataElements") {
                indicatorGroupManager.loadAllDataElementGroup().then(function(dataElementGroups){
                    $scope.dataElementGroups = dataElementGroups;
                    $scope.itemGroupSelection=dataElementGroups;
                    $(".dataElementsIndicatorsFilter").css("display","block");
                });
            }else if($scope.score_card.indicator_dataElement_reporting_rate_selection=="DataSets") {
                indicatorGroupManager.loadAlldataSet().then(function(dataSets){
                    $scope.dataSets = dataSets;
                    $scope.itemGroupSelection=dataSets;
                    //Hide further selection on for reporting ratae
                    $(".dataElementsIndicatorsFilter").css("display","none");
                });
            }
            //Based on selection, update list of data element groups, data elements and
            //final selection
        };
        $scope.addAnotherPlaceholderGroup = function() {
            //if($scope.indicator_holder_group.name!=null){
                //Make sure name exist and indicator list is atleast one before allowing to add.
                var new_holder_id = ($scope.score_card.data_settings.indicator_holders.length+1);
                $scope.current_indicator_holder_position= ($scope.score_card.data_settings.indicator_holders.push({
                    "holder_id":new_holder_id,
                    "indicators":[]
                })-1);

                $scope.score_card.data_settings.indicator_holder_groups.push({
                    "name":null,
                    "indicator_holder_ids":[new_holder_id],
                    "background_color":"#ffffff",
                    "holder_style":null
                });

                $('.add_another_placeholder_group_button').css("display","none").addClass("already_worked_on");
                $('.add_another_placeholder_group_button').removeClass('add_another_placeholder_button');

           // }


        };

        if(typeof($scope.score_card.indicator_dataElement_reporting_rate_selection)=="undefined"){
            //Selection variables
            $scope.score_card.indicator_dataElement_reporting_rate_selection="Indicators";
        }

        if($scope.score_card.indicator_dataElement_reporting_rate_selection=="Indicators") {
            indicatorGroupManager.loadAllIndicatorGroup().then(function(indicatorGroups){
                $scope.indicatorGroups = indicatorGroups;
                $scope.itemGroupSelection=indicatorGroups;
            });
        }else if($scope.score_card.indicator_dataElement_reporting_rate_selection=="DataElements") {
            indicatorGroupManager.loadAllDataElementGroup().then(function(dataElementGroups){
                $scope.dataElementGroups = dataElementGroups;
                $scope.itemGroupSelection=dataElementGroups;
            });
        }else if($scope.score_card.indicator_dataElement_reporting_rate_selection=="DataSets") {
            indicatorGroupManager.loadAlldataSet().then(function(dataSets){
                $scope.dataSets = dataSets;
                $scope.itemGroupSelection=dataSets;
            });
        }


        $scope.selectItemGroupOrAddDataSet = function(itemGroup){
            $scope.displayItems = [];
            if($scope.score_card.indicator_dataElement_reporting_rate_selection=="Indicators") {
                indicatorGroupManager.getIndicatorGroupItems(itemGroup.id).then(function(indicators){
                    $scope.displayItems = indicators;
                });
            }else if($scope.score_card.indicator_dataElement_reporting_rate_selection=="DataElements") {
                indicatorGroupManager.getDataElementGroupItems(itemGroup.id).then(function(dataElements){
                    $scope.displayItems = dataElements;
                });
            }else if($scope.score_card.indicator_dataElement_reporting_rate_selection=="DataSets") {
                //Add dataset to list of selection
                console.log('Add dataset to items')
            }
        };

        //delete a single added indicator
        $scope.dropIndicator = function(indicatorList,indicator){
            if(confirm("Are you sure you want to delete this indicator?")==true) {
                angular.forEach(indicatorList, function (value, key) {
                    if (indicator.id == value.id) {
                        indicatorList.splice(key, 1);
                    }
                })
            }
        };

        //check if the indicator is already added
        $scope.indicatorExist = function(holders,indicator){
            var check = false;
            angular.forEach(holders,function(holder){
                angular.forEach(holder.indicators,function(indicatorValue){
                    if(indicatorValue.id == indicator.id){
                        check = true;
                    }
                })
            });
            return check;
        };

        $scope.displayItemToPlaceholder = function(item) {
            if($scope.indicatorExist($scope.score_card.data_settings.indicator_holders,item)){
                alert(item.name +' Have already been added on your score card ');
            }
            else if($scope.score_card.data_settings.indicator_holders[$scope.current_indicator_holder_position].indicators.length>=2) {
                alert('Max of two indicators can be selected, use Ctrl-Click to unselect');
            }else {
                item.legendset = [
                    {
                        "color": $scope.getDefitionColor($scope.score_card.legendset_definitions,0).color,
                        "min": "80",
                        "max": "-"
                    },
                    {
                        "color": $scope.getDefitionColor($scope.score_card.legendset_definitions,1).color,
                        "min": "60",
                        "max": "80"
                    },
                    {
                        "color": $scope.getDefitionColor($scope.score_card.legendset_definitions,2).color,
                        "min": "0",
                        "max": "60"
                    }
                ];
                item.arrow_settings = {
                    "effective_gap": 5,
                    "display": true
                };
                item.legend_display = true;
                item.title = item.name;
                item.high_is_good = true;
                item.weight = 100;
                $scope.current_indicator_position=($scope.score_card.data_settings.indicator_holders[$scope.current_indicator_holder_position].indicators.push(item)-1);
            }

            $(".selection_field").css("display","block");
            $(".no_selection_field").css("display","none");
        };
        $scope.descendLegendColor=function (item) {
            //if(confirm($scope.checked)==true) {
        if($scope.checked==true){
             item.legendset=[
                 {
                     "color": $scope.getDefitionColor($scope.score_card.legendset_definitions,2).color,
                     "min": "60",
                     "max": "0"
                 }

             ]
        }


        };

        //updating the indicator
        $scope.updatePlaceholder = function(indicator_holder){
            $scope.current_indicator_holder_position = indicator_holder.holder_position;
            $(".selection_field").css("display","block");
            $(".no_selection_field").css("display","none");
            $timeout( function() {
                $('.holder_name').css({"background-color": "#ffffff", "width":"","font-size":""});
                $('#indicator_holder'+$scope.current_indicator_holder_position).css({"background-color": "rgba(0, 0, 0, 0.0980392)", "width":"","font-size":""});
            });
        };
        //updating the indicator
        $scope.deletePlaceholder = function(indicator_holder){
            if(confirm("Are you sure you want to delete this data?")==true){
            var pos = 0;
            angular.forEach($scope.score_card.data_settings.indicator_holders,function(value,key){

                if(value.holder_id == indicator_holder.holder_id){
                    $scope.score_card.data_settings.indicator_holders.splice(key,1);
                }else{
                    value.holder_position = pos;
                    pos++;
                }
            });
            angular.forEach($scope.score_card.data_settings.indicator_holder_groups,function(group){
                angular.forEach(group.indicator_holder_ids,function(value,key){
                    if(value == indicator_holder.holder_id){
                        group.indicator_holder_ids.splice(key,1);
                    }
                });
            });
            $scope.current_indicator_holder_position  = $scope.score_card.data_settings.indicator_holders.length -1;
            console.log($scope.score_card.data_settings.indicator_holders);
            }
        };

        $scope.addAnotherPlaceholder = function() {
            var new_holder_id = $scope.makeid();
            $scope.current_indicator_holder_position = ($scope.score_card.data_settings.indicator_holders.push({
                "holder_id":new_holder_id,
                "holder_position":$scope.current_indicator_holder_position+1,
                "indicators":[]
            })-1);
            $scope.score_card.data_settings.indicator_holder_groups[$scope.current_indicator_holder_position_group_position].indicator_holder_ids.push(new_holder_id);
            console.log($scope.score_card.data_settings.indicator_holder_groups[$scope.current_indicator_holder_position_group_position].indicator_holder_ids);
            $('.add_another_placeholder_button').css("display","none").addClass("already_worked_on");
            $('.add_another_placeholder_button').removeClass('add_another_placeholder_button');
            $timeout( function() {
                $('.holder_name').css({"background-color": "#ffffff", "width":"","font-size":""});
                $('#indicator_holder'+$scope.current_indicator_holder_position).css({"background-color": "rgba(0, 0, 0, 0.0980392)", "width":"","font-size":""});
            });
            //Add a different class and remove the create button.

        };
        $scope.indicator_holders_id = function(holder){
          return holder.id
        };

        $scope.addCurrentItemTolist = function() {
            $scope.current_indicator_holder_position.indicators.push($scope.current_indicator);
            $scope.get_indicator_holder_by_id($scope.current_indicator_holder_position.holder_id).indicators.push($scope.current_indicator);
        };


        $scope.saveScoreCardAfterVerification = function() {
            //Submit the created score-card
            if($scope.score_card.header.title!=null && $scope.score_card.header.description!=null) {
                var id = $scope.makeid();
                angular.forEach($scope.score_card.data_settings.indicator_holder_groups, function (dat) {
                    angular.forEach(dat.indicator_holder_ids, function (hold, key) {
                        if (hold == 1) {
                            dat.indicator_holder_ids.splice(key, 1);
                        }
                    })
                });
                angular.forEach($scope.score_card.data_settings.indicator_holders, function (dat, key1) {
                    if (dat.indicators.length == 0) {
                        $scope.score_card.data_settings.indicator_holders.splice(key1, 1);
                    }
                });
                $http.post(DHIS2URL + "/api/dataStore/scorecards/" + id, $scope.score_card).then(function (results) {
                    console.log('it worked!');
                    $location.path("/show/" + id);
                }, function (errorMessage) {
                    console.log('errors happens');
                });
            }else
                alert('error!score card title and description need to be filled');
        };

        $scope.deleteScoreCard = function(scorecardKey) {
            var deletionUrl=DHIS2URL+"/api/dataStore/scorecards/"+scorecardKey;
            $http.delete(deletionUrl)
                .then(
                function(response){
                    console.log('Deletion successful');
                    console.log(response);
                },
                function(response){
                    console.log('Deletion failed');
                    console.log(response);
                }
            );
        };

        $scope.hoverOut = function(){
            $scope.hoverEdit = false;
        };


    }]);
