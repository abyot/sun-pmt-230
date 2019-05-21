/* global angular */

'use strict';

var sunPMT = angular.module('sunPMT');

//Controller for settings page
sunPMT.controller('dataEntryController',
        function($scope,
                $filter,
                $modal,
                $window,
                $translate,
                orderByFilter,
                SessionStorageService,
                storage,
                DataSetFactory,
                PeriodService,
                MetaDataFactory,
                CommonUtils,
                DataValueService,
                EventService,
                CompletenessService,
                ModalService,
                DialogService) {
    $scope.periodOffset = 0;
    $scope.saveStatus = {};    
    var addNewOption = {code: 'ADD_NEW_OPTION', id: 'ADD_NEW_OPTION', displayName: '[Add New Stakeholder]'};
    $scope.model = {invalidDimensions: false,
                    selectedAttributeCategoryCombo: null,
                    standardDataSets: [],
                    multiDataSets: [],
                    dataSets: [],
                    optionSets: null,
                    programs: null,
                    categoryOptionsReady: false,
                    allowMultiOrgUnitEntry: false,
                    selectedOptions: [],
                    stakeholderRoles: {},
                    dataValues: {},
                    roleValues: {},
                    orgUnitsWithValues: [],
                    selectedProgram: null,
                    selectedAttributeOptionCombos: {},
                    selectedAttributeOptionCombo: null,
                    selectedEvent: {},
                    stakeholderCategory: null,
                    attributeCategoryUrl: null,
                    valueExists: false,
                    rolesAreDifferent: false,
                    overrideRoles: false};
    
    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {
        $scope.model.periods = [];
        $scope.model.dataSets = [];
        $scope.model.selectedDataSet = null;
        $scope.model.selectedPeriod = null;
        $scope.model.selectedAttributeCategoryCombo = null;
        $scope.model.selectedAttributeOptionCombos = {};
        $scope.model.selectedAttributeOptionCombo = null;
        $scope.model.selectedProgram = null;
        $scope.model.stakeholderRoles = {};
        $scope.model.dataValues = {};
        $scope.model.basicAuditInfo = {};
        $scope.model.selectedEvent = {};
        $scope.model.orgUnitsWithValues = [];
        $scope.model.categoryOptionsReady = false;
        $scope.model.valueExists = false;
        if( angular.isObject($scope.selectedOrgUnit)){
            SessionStorageService.set('SELECTED_OU', $scope.selectedOrgUnit); 
            var systemSetting = storage.get('SYSTEM_SETTING');
            $scope.model.allowMultiOrgUnitEntry = systemSetting && systemSetting.multiOrganisationUnitForms ? systemSetting.multiOrganisationUnitForms : false;
            loadOptionSets();
            $scope.loadDataSets($scope.selectedOrgUnit);
        }
    });
        
    function loadOptionSets() {        
        if(!$scope.model.optionSets){
            $scope.model.optionSets = [];
            MetaDataFactory.getAll('optionSets').then(function(optionSets){
                angular.forEach(optionSets, function(optionSet){
                    $scope.model.optionSets[optionSet.id] = optionSet;
                    /*if( optionSet.StakeholderRole === 'Funder' ){
                        $scope.stakeholderList = optionSet;
                        var o = angular.copy( optionSet );
                        o.options.push(addNewOption);
                        $scope.model.optionSets[optionSet.id] = o;
                    }
                    else{
                        $scope.model.optionSets[optionSet.id] = optionSet;
                    }*/                    
                });
            });
        }
    }
    
    function loadOptionCombos(){
        $scope.model.selectedAttributeCategoryCombo = null;     
        if( $scope.model.selectedDataSet && $scope.model.selectedDataSet.categoryCombo && $scope.model.selectedDataSet.categoryCombo.id ){
            MetaDataFactory.get('categoryCombos', $scope.model.selectedDataSet.categoryCombo.id).then(function(coc){
                $scope.model.selectedAttributeCategoryCombo = coc;
                if( $scope.model.selectedAttributeCategoryCombo && $scope.model.selectedAttributeCategoryCombo.isDefault ){
                    $scope.model.categoryOptionsReady = true;
                }                
                angular.forEach($scope.model.selectedAttributeCategoryCombo.categoryOptionCombos, function(oco){
                    $scope.model.selectedAttributeOptionCombos['"' + oco.displayName + '"'] = oco.id;
                });

                angular.forEach($scope.model.selectedAttributeCategoryCombo.categories, function(cat){
                    cat.placeHolder = $translate.instant('select_or_search');
                    /*if( cat.code === 'FI' ){                        
                        $scope.model.stakeholderCategory = cat;
                        cat.placeHolder = $translate.instant('select_or_search_or_add');
                        if( cat.code === 'FI' && cat.categoryOptions.indexOf( addNewOption) === -1 ){
                            cat.categoryOptions.push(addNewOption);
                        }
                    }*/
                });
            });
        }
    }    
    
    //load datasets associated with the selected org unit.
    $scope.loadDataSets = function(orgUnit) {
        $scope.selectedOrgUnit = orgUnit;
        $scope.model.dataSets = [];
        $scope.model.selectedAttributeCategoryCombo = null;
        $scope.model.selectedAttributeOptionCombos = {};
        $scope.model.selectedAttributeOptionCombo = null;
        $scope.model.selectedProgram = null;
        $scope.model.selectedPeriod = null;  
        $scope.model.stakeholderRoles = {};
        $scope.model.orgUnitsWithValues = [];
        $scope.model.selectedEvent = {};
        $scope.model.dataValues = {};
        $scope.model.valueExists = false;
        if (angular.isObject($scope.selectedOrgUnit)) {            
            DataSetFactory.getActionDataSets( $scope.selectedOrgUnit ).then(function(dataSets){                
                $scope.model.dataSets = dataSets;
                $scope.model.dataSets = orderByFilter($scope.model.dataSets, '-displayName').reverse();
                if(!$scope.model.programs){
                    $scope.model.programs = [];
                    MetaDataFactory.getAll('programs').then(function(programs){
                        angular.forEach(programs, function(program){
                            $scope.model.programs[program.actionCode] = program;
                        });                        
                    });
                }                
            });
        }        
    }; 
    
    //watch for selection of data set
    $scope.$watch('model.selectedDataSet', function() {        
        $scope.model.periods = [];
        $scope.model.selectedPeriod = null;
        $scope.model.categoryOptionsReady = false;
        $scope.model.stakeholderRoles = {};
        $scope.model.dataValues = {};
        $scope.model.selectedProgram = null;
        $scope.model.selectedEvent = {};
        $scope.model.orgUnitsWithValues = [];
        $scope.model.valueExists = false;
        if( angular.isObject($scope.model.selectedDataSet) && $scope.model.selectedDataSet.id){
            $scope.loadDataSetDetails();
        }
    });
    
    $scope.$watch('model.selectedPeriod', function(){        
        $scope.model.dataValues = {};
        $scope.model.valueExists = false;
        $scope.loadDataEntryForm();
    });    
        
    $scope.loadDataSetDetails = function(){
        if( $scope.model.selectedDataSet && $scope.model.selectedDataSet.id && $scope.model.selectedDataSet.periodType){ 
            
            $scope.model.periods = PeriodService.getPeriods($scope.model.selectedDataSet.periodType, $scope.periodOffset, $scope.model.selectedDataSet.openFuturePeriods);
            
            if(!$scope.model.selectedDataSet.dataElements || $scope.model.selectedDataSet.dataElements.length < 1){                
                $scope.invalidCategoryDimensionConfiguration('error', 'missing_data_elements_indicators');
                return;
            }            
            
            loadOptionCombos();            
            
            $scope.model.selectedCategoryCombos = {};
            $scope.model.dataElements = [];
            angular.forEach($scope.model.selectedDataSet.dataElements, function(de){
                $scope.model.selectedProgram = $scope.model.programs[de.code];
                $scope.model.dataElements[de.id] = de.code;
                
                MetaDataFactory.get('categoryCombos', de.categoryCombo.id).then(function(coc){
                    if( coc.isDefault ){
                        $scope.model.defaultCategoryCombo = coc;
                    }
                    $scope.model.selectedCategoryCombos[de.categoryCombo.id] = coc;
                });                
            });
        }
    };
    
    var resetParams = function(){
        $scope.model.dataValues = {};
        $scope.model.roleValues = {};
        $scope.model.orgUnitsWithValues = [];
        $scope.model.selectedEvent = {};
        $scope.model.valueExists = false;
        $scope.model.stakeholderRoles = {};
        $scope.model.basicAuditInfo = {};
        $scope.model.basicAuditInfo.exists = false;
        $scope.model.rolesAreDifferent = false;
        $scope.saveStatus = {};
        $scope.commonOrgUnit = null;
        $scope.commonOptionCombo = null;
    };
    
    $scope.loadDataEntryForm = function(){
        
        resetParams();
        if( angular.isObject( $scope.selectedOrgUnit ) && $scope.selectedOrgUnit.id &&
                angular.isObject( $scope.model.selectedDataSet ) && $scope.model.selectedDataSet.id &&
                angular.isObject( $scope.model.selectedPeriod) && $scope.model.selectedPeriod.id &&
                angular.isObject( $scope.model.selectedProgram) && $scope.model.selectedProgram.id && $scope.model.selectedProgram.programStages &&
                $scope.model.categoryOptionsReady ){
            
            var dataValueSetUrl = 'dataSet=' + $scope.model.selectedDataSet.id + '&period=' + $scope.model.selectedPeriod.id;

            if( $scope.model.allowMultiOrgUnitEntry && $scope.model.selectedDataSet.entryMode === 'multiple'){
                angular.forEach($scope.selectedOrgUnit.c, function(c){
                    
                    if( !$scope.commonOrgUnit ){
                        $scope.commonOrgUnit = c;
                    }                        
                    
                    dataValueSetUrl += '&orgUnit=' + c;                    
                    if( $scope.model.selectedProgram && $scope.model.selectedProgram.programStages ){                        
                        var dataElement = $scope.model.selectedDataSet.dataElements[0];
                        $scope.model.stakeholderRoles[c] = {};
                        angular.forEach($scope.model.selectedCategoryCombos[dataElement.categoryCombo.id].categoryOptionCombos, function(oco){                      
                            if( !$scope.commonOptionCombo ){
                                $scope.commonOptionCombo = oco.id;
                            }                            
                            $scope.model.stakeholderRoles[c][oco.id] = {};
                            angular.forEach($scope.model.selectedProgram.programStages[0].programStageDataElements, function(prStDe){
                                $scope.model.stakeholderRoles[c][oco.id][prStDe.dataElement.id] = [];
                            });
                        });
                    }
                });
            }
            else if( !$scope.model.allowMultiOrgUnitEntry || $scope.model.selectedDataSet.entryMode === "single" ){
                $scope.commonOrgUnit = $scope.selectedOrgUnit.id;                
                dataValueSetUrl += '&orgUnit=' + $scope.selectedOrgUnit.id;
                if( $scope.model.selectedProgram && $scope.model.selectedProgram.programStages ){
                    var dataElement = $scope.model.selectedDataSet.dataElements[0];
                    $scope.model.stakeholderRoles[$scope.selectedOrgUnit.id] = {};
                    angular.forEach($scope.model.selectedCategoryCombos[dataElement.categoryCombo.id].categoryOptionCombos, function(oco){
                        if( !$scope.commonOptionCombo ){
                            $scope.commonOptionCombo = oco.id;
                        }
                        $scope.model.stakeholderRoles[$scope.selectedOrgUnit.id][oco.id] = {};
                        angular.forEach($scope.model.selectedProgram.programStages[0].programStageDataElements, function(prStDe){                            
                            $scope.model.stakeholderRoles[$scope.selectedOrgUnit.id][oco.id][prStDe.dataElement.id] = [];
                        });
                    });                    
                }
            }
            
            $scope.model.selectedAttributeOptionCombo = CommonUtils.getOptionComboIdFromOptionNames($scope.model.selectedAttributeOptionCombos, $scope.model.selectedOptions);

            //fetch events containing stakholder-role mapping
            $scope.model.attributeCategoryUrl = {cc: $scope.model.selectedAttributeCategoryCombo.id, default: $scope.model.selectedAttributeCategoryCombo.isDefault, cp: CommonUtils.getOptionIds($scope.model.selectedOptions)};
            
            EventService.getByOrgUnitAndProgram($scope.selectedOrgUnit.id, 'CHILDREN', $scope.model.selectedProgram.id, $scope.model.attributeCategoryUrl, null, $scope.model.selectedPeriod.startDate, $scope.model.selectedPeriod.endDate).then(function(events){
                
                var sampleRole = null;
                angular.forEach(events, function(ev){
                    if( ev.event ){                        
                        if( !$scope.model.selectedEvent[ev.orgUnit] ){
                            $scope.model.selectedEvent[ev.orgUnit] = {};
                        }                        
                        $scope.model.selectedEvent[ev.orgUnit][ev.categoryOptionCombo] = {event: ev.event, dataValues: ev.dataValues};
                        angular.forEach(ev.dataValues, function(dv){
                            var val = CommonUtils.pushRoles( $scope.model.stakeholderRoles[ev.orgUnit][ev.categoryOptionCombo][dv.dataElement], dv.value );
                            $scope.model.stakeholderRoles[ev.orgUnit][ev.categoryOptionCombo][dv.dataElement] = val;
                        });
                    }
                });
                
                
                if( $scope.model.allowMultiOrgUnitEntry && $scope.model.selectedDataSet.entryMode === "multiple" ){
                    var sampleRole = null;
                    for(var i=0; i<$scope.selectedOrgUnit.c.length; i++){
                        if( !sampleRole ){
                            sampleRole = $scope.model.stakeholderRoles[$scope.selectedOrgUnit.c[i]];
                        }
                        if( !angular.equals($scope.model.stakeholderRoles[$scope.selectedOrgUnit.c[i]], sampleRole) ){
                            $scope.model.rolesAreDifferent = true;
                            break;
                        }
                        
                        var _sampleRole = null;
                        var _roles = $scope.model.stakeholderRoles[$scope.selectedOrgUnit.c[i]];                    
                        for( var key in _roles ){
                            if( !_sampleRole ){
                                _sampleRole = _roles[key];
                            }
                            if( !angular.equals(_roles[key], _sampleRole) ){
                                $scope.model.rolesAreDifferent = true;
                                break;
                            }
                        }
                    }                    
                }        
                else if( !$scope.model.allowMultiOrgUnitEntry || $scope.model.selectedDataSet.entryMode === "single" ){
                    var sampleRole = null;                    
                    var _roles = $scope.model.stakeholderRoles[$scope.selectedOrgUnit.id];                    
                    for( var key in _roles ){
                        if( !sampleRole ){
                            sampleRole = _roles[key];
                        }
                        if( !angular.equals(_roles[key], sampleRole) ){
                            $scope.model.rolesAreDifferent = true;
                            break;
                        }
                    }
                }
            });
            
            //fetch data values...
            DataValueService.getDataValueSet( dataValueSetUrl ).then(function(response){
                if( response && response.dataValues && response.dataValues.length > 0 ){                    
                    response.dataValues = $filter('filter')(response.dataValues, {attributeOptionCombo: $scope.model.selectedAttributeOptionCombo});                    
                    if( response.dataValues.length > 0 ){
                        $scope.model.valueExists = true;
                        angular.forEach(response.dataValues, function(dv){
                            if(!$scope.model.dataValues[dv.orgUnit]){
                                $scope.model.dataValues[dv.orgUnit] = {};
                                $scope.model.dataValues[dv.orgUnit][dv.dataElement] = {};
                                $scope.model.dataValues[dv.orgUnit][dv.dataElement][dv.categoryOptionCombo] = dv;
                            }
                            else{
                                if(!$scope.model.dataValues[dv.orgUnit][dv.dataElement]){
                                    $scope.model.dataValues[dv.orgUnit][dv.dataElement] = {};
                                }
                                $scope.model.dataValues[dv.orgUnit][dv.dataElement][dv.categoryOptionCombo] = dv;
                            }                 
                        });
                        response.dataValues = orderByFilter(response.dataValues, '-created').reverse();                    
                        $scope.model.basicAuditInfo.created = $filter('date')(response.dataValues[0].created, 'dd MMM yyyy');
                        $scope.model.basicAuditInfo.storedBy = response.dataValues[0].storedBy;
                        $scope.model.basicAuditInfo.exists = true;
                    }
                }                
            });
            
            $scope.model.dataSetCompletness = {};
            CompletenessService.get( $scope.model.selectedDataSet.id, 
                                    $scope.selectedOrgUnit.id,
                                    $scope.model.selectedPeriod.startDate,
                                    $scope.model.selectedPeriod.endDate,
                                    $scope.model.allowMultiOrgUnitEntry).then(function(response){                
                if( response && 
                        response.completeDataSetRegistrations && 
                        response.completeDataSetRegistrations.length &&
                        response.completeDataSetRegistrations.length > 0){
                    
                    angular.forEach(response.completeDataSetRegistrations, function(cdr){
                        $scope.model.dataSetCompletness[cdr.attributeOptionCombo] = true;                        
                    });
                }
            });
        }
    };
    
    function checkOptions(){
        resetParams();
        for(var i=0; i<$scope.model.selectedAttributeCategoryCombo.categories.length; i++){
            if($scope.model.selectedAttributeCategoryCombo.categories[i].selectedOption && $scope.model.selectedAttributeCategoryCombo.categories[i].selectedOption.id){
                $scope.model.categoryOptionsReady = true;
                $scope.model.selectedOptions.push($scope.model.selectedAttributeCategoryCombo.categories[i].selectedOption);
            }
            else{
                $scope.model.categoryOptionsReady = false;
                break;
            }
        }        
        if($scope.model.categoryOptionsReady){
            $scope.loadDataEntryForm();
        }
    };
    
    function showAddStakeholder( category ) {
        var modalInstance = $modal.open({
            templateUrl: 'components/stakeholder/stakeholder.html',
            controller: 'StakeholderController',
            resolve: {
                categoryCombo: function(){
                    return $scope.model.selectedAttributeCategoryCombo;
                },
                category: function () {
                    return category;
                },
                optionSet: function(){
                    return $scope.stakeholderList;
                }
            }
        });

        modalInstance.result.then(function ( status ) {
            if( status ){
                $window.location.reload();
            }
        });
    };    
    
    $scope.getCategoryOptions = function(category){
        $scope.model.categoryOptionsReady = false;
        $scope.model.selectedOptions = [];
        
        if( category && category.selectedOption && category.selectedOption.id === 'ADD_NEW_OPTION' ){
            category.selectedOption = null;
            showAddStakeholder( category );
        }        
        else{
            checkOptions();
        }        
    };
    
    $scope.getPeriods = function(mode){
        
        if( mode === 'NXT'){
            $scope.periodOffset = $scope.periodOffset + 1;
            $scope.model.selectedPeriod = null;
            $scope.model.periods = PeriodService.getPeriods($scope.model.selectedDataSet.periodType, $scope.periodOffset, $scope.model.selectedDataSet.openFuturePeriods);
        }
        else{
            $scope.periodOffset = $scope.periodOffset - 1;
            $scope.model.selectedPeriod = null;
            $scope.model.periods = PeriodService.getPeriods($scope.model.selectedDataSet.periodType, $scope.periodOffset, $scope.model.selectedDataSet.openFuturePeriods);
        }
    };
    
    
    var handleRole = function(ou, dataElement, dataElementId, dataValue, newEvents){
        angular.forEach($scope.model.selectedCategoryCombos[dataElement.categoryCombo.id].categoryOptionCombos, function(oco){
                
            if( $scope.model.selectedEvent[ou] && $scope.model.selectedEvent[ou][oco.id] && $scope.model.selectedEvent[ou][oco.id].event ){                        

                if( dataValue.value !== "" ){
                    $scope.model.stakeholderRoles[ou][oco.id][dataElementId] = dataValue.value.split(",");
                }
                else{
                    $scope.model.stakeholderRoles[ou][oco.id][dataElementId] = [];
                }

                var updated = false;
                for( var i=0; i<$scope.model.selectedEvent[ou][oco.id].dataValues.length; i++ ){
                    if( $scope.model.selectedEvent[ou][oco.id].dataValues[i].dataElement === dataElementId ){
                        $scope.model.selectedEvent[ou][oco.id].dataValues[i] = dataValue;
                        updated = true;
                        break;
                    }
                }
                if( !updated ){
                    $scope.model.selectedEvent[ou][oco.id].dataValues.push( dataValue );
                }

                //update event
                EventService.update( $scope.model.selectedEvent[ou][oco.id] ).then(function(){                        
                });

            }
            else{                        
                if( newEvents[ou] && newEvents[ou][oco.id]){
                    event = newEvents[ou][oco.id].dataValues.push( dataValue );
                }
                else{
                    var event = {
                        program: $scope.model.selectedProgram.id,
                        programStage: $scope.model.selectedProgram.programStages[0].id,
                        status: 'ACTIVE',
                        orgUnit: ou,
                        eventDate: $scope.model.selectedPeriod.endDate,
                        dataValues: [dataValue],
                        attributeCategoryOptions: CommonUtils.getOptionIds($scope.model.selectedOptions),
                        categoryOptionCombo: oco.id
                    };
                    if( !newEvents[ou] ){
                        newEvents[ou] = {};
                        newEvents[ou][oco.id] = {};
                    }
                    if( newEvents[ou] ){
                        newEvents[ou][oco.id] = {};
                    }
                    newEvents[ou][oco.id] = event;
                }                    
            }
        });
    };
    
    $scope.saveRole = function( dataElementId ){
        
        var dataElement = $scope.model.selectedDataSet.dataElements[0];
        if( $scope.model.stakeholderRoles[$scope.commonOrgUnit][$scope.commonOptionCombo][dataElementId].indexOf( "[Add New Stakeholder]") !== -1 ){
            $scope.model.stakeholderRoles[$scope.commonOrgUnit][$scope.commonOptionCombo][dataElementId] = $scope.model.stakeholderRoles[$scope.commonOrgUnit][$scope.commonOptionCombo][dataElementId].slice(0,-1);
            showAddStakeholder( $scope.model.stakeholderCategory );
            return;
        }
        
        var newEvents = {};
        var events = {events: []};
        if( $scope.model.allowMultiOrgUnitEntry && $scope.model.selectedDataSet.entryMode === "multiple" ){
            
            var dataValue = {dataElement: dataElementId, value: $scope.model.stakeholderRoles[$scope.commonOrgUnit][$scope.commonOptionCombo][dataElementId].join()};
            
            angular.forEach($scope.selectedOrgUnit.c, function(ou){
                handleRole(ou, dataElement, dataElementId, dataValue, newEvents);
            });            
            
            angular.forEach($scope.selectedOrgUnit.c, function(ou){
                angular.forEach($scope.model.selectedCategoryCombos[dataElement.categoryCombo.id].categoryOptionCombos, function(oco){
                    if( newEvents[ou] && newEvents[ou][oco.id] ){
                        events.events.push( newEvents[ou][oco.id] );
                    }
                });                                
            });
        }        
        else if( !$scope.model.allowMultiOrgUnitEntry || $scope.model.selectedDataSet.entryMode === "single" ){
            
            var dataValue = {dataElement: dataElementId, value: $scope.model.stakeholderRoles[$scope.commonOrgUnit][$scope.commonOptionCombo][dataElementId].join()};
            
            handleRole($scope.selectedOrgUnit.id, dataElement, dataElementId, dataValue, newEvents);
            
            angular.forEach($scope.model.selectedCategoryCombos[dataElement.categoryCombo.id].categoryOptionCombos, function(oco){
                if( newEvents[$scope.selectedOrgUnit.id] && newEvents[$scope.selectedOrgUnit.id][oco.id] ){
                    events.events.push( newEvents[$scope.selectedOrgUnit.id][oco.id] );
                }
            });
        }
        
        if( events.events.length > 0 ){
            //add event
            EventService.create(events).then(function ( json ) {
                if( json && json.response && json.response.importSummaries && json.response.importSummaries.length ){                            
                    for( var i=0; i<json.response.importSummaries.length; i++){
                        if( json.response.importSummaries[i] && 
                                json.response.importSummaries[i].status === 'SUCCESS' && 
                                json.response.importSummaries[i].reference ){                            
                            var ev = events.events[i];
                            if( !$scope.model.selectedEvent[ev.orgUnit] ){
                                $scope.model.selectedEvent[ev.orgUnit] = {};
                                $scope.model.selectedEvent[ev.orgUnit][ev.categoryOptionCombo] = {};
                            }
                            if( !$scope.model.selectedEvent[ev.orgUnit][ev.categoryOptionCombo] ){
                                $scope.model.selectedEvent[ev.orgUnit][ev.categoryOptionCombo] = {};
                            }
                            
                            if( dataValue.value !== "" ){
                                $scope.model.stakeholderRoles[ev.orgUnit][ev.categoryOptionCombo][dataElementId] = dataValue.value.split(",");
                            }
                            else{
                                $scope.model.stakeholderRoles[ev.orgUnit][ev.categoryOptionCombo][dataElementId] = [];
                            }
                            
                            $scope.model.selectedEvent[ev.orgUnit][ev.categoryOptionCombo] = {event: json.response.importSummaries[i].reference, dataValues: ev.dataValues};
                        }
                    }
                }
            });
        }
    };
    
    $scope.saveDataValue = function( ouId, deId, ocId ){
        
        $scope.saveStatus[ouId + '-' + deId + '-' + ocId] = {saved: false, pending: true, error: false};
        
        var dataValue = {ou: ouId,
                    pe: $scope.model.selectedPeriod.id,
                    de: deId,
                    co: ocId,
                    cc: $scope.model.selectedAttributeCategoryCombo.id,
                    cp: CommonUtils.getOptionIds($scope.model.selectedOptions),
                    value: $scope.model.dataValues[ouId][deId][ocId].value
                };
                
        DataValueService.saveDataValue( dataValue ).then(function(response){
           $scope.saveStatus[ouId + '-' + deId + '-' + ocId].saved = true;
           $scope.saveStatus[ouId + '-' + deId + '-' + ocId].pending = false;
           $scope.saveStatus[ouId + '-' + deId + '-' + ocId].error = false;
        }, function(){
            $scope.saveStatus[ouId + '-' + deId + '-' + ocId].saved = false;
            $scope.saveStatus[ouId + '-' + deId + '-' + ocId].pending = false;
            $scope.saveStatus[ouId + '-' + deId + '-' + ocId].error = true;
        });
    };    
    
    $scope.getInputNotifcationClass = function(ouId, deId, ocId){

        var currentElement = $scope.saveStatus[ouId + '-' + deId + '-' + ocId];        
        
        if( currentElement ){
            if(currentElement.pending){
                return 'form-control input-pending';
            }

            if(currentElement.saved){
                return 'form-control input-success';
            }            
            else{
                return 'form-control input-error';
            }
        }    
        
        return 'form-control';
    };
    
    $scope.showEditStakeholderRoles = function( ouId, ouName ){
                
        var modalInstance = $modal.open({
            templateUrl: 'components/stakeholder/stakeholder-role.html',
            controller: 'StakeholderRoleController',
            windowClass: 'modal-full-window',
            resolve: {
                period: function(){
                    return $scope.model.selectedPeriod;
                },
                program: function () {
                    return $scope.model.selectedProgram;
                },
                currentOrgUnitId: function(){
                    return  ouId;
                },
                currentOrgUnitName: function(){
                    return  ouName;
                },
                currentEvent: function(){
                    return $scope.model.selectedEvent[ouId] ? $scope.model.selectedEvent[ouId] : {};
                },
                optionCombos: function(){                    
                    return $scope.model.selectedCategoryCombos[$scope.model.selectedDataSet.dataElements[0].categoryCombo.id].categoryOptionCombos;
                },
                attributeCategoryOptions: function(){
                    return CommonUtils.getOptionIds($scope.model.selectedOptions);
                },
                allStakeholderRoles: function(){
                    return $scope.model.stakeholderRoles;
                },
                optionSets: function(){
                    return $scope.model.optionSets;
                },
                stakeholderCategory: function(){
                    return $scope.model.stakeholderCategory;
                },
                rolesAreDifferent: function(){
                    return $scope.model.rolesAreDifferent;
                },
                selectedOrgUnit: function(){
                    return $scope.selectedOrgUnit;
                },
                commonOptionCombo:  function(){
                    return $scope.commonOptionCombo;
                }
            }
        });

        modalInstance.result.then(function ( result ) {
            if( result ){
                $scope.model.selectedEvent[ouId] = result.currentEvent;
                $scope.model.stakeholderRoles[ouId] = result.stakeholderRoles;
                $scope.model.rolesAreDifferent = result.rolesAreDifferent;
            }            
        });        
    };
    
    $scope.getAuditInfo = function(de, ouId, oco, value, comment){        
        var modalInstance = $modal.open({
            templateUrl: 'components/dataentry/history.html',
            controller: 'DataEntryHistoryController',
            windowClass: 'modal-window-history',
            resolve: {
                period: function(){
                    return $scope.model.selectedPeriod;
                },
                dataElement: function(){
                    return de;
                },
                value: function(){
                    return value;
                },
                comment: function(){
                    return comment;
                },
                program: function () {
                    return $scope.model.selectedProgram;
                },
                orgUnitId: function(){
                    return  ouId;
                },
                attributeCategoryCombo: function(){
                    return $scope.model.selectedAttributeCategoryCombo;
                },
                attributeCategoryOptions: function(){
                    return CommonUtils.getOptionIds($scope.model.selectedOptions);
                },
                attributeOptionCombo: function(){
                    return $scope.model.selectedAttributeOptionCombo;
                },
                optionCombo: function(){
                    return oco;
                },
                currentEvent: function(){
                    return $scope.model.selectedEvent[ouId];
                }
            }
        });
        
        modalInstance.result.then(function () {
        }); 
    };
    
    $scope.overrideRole = function(){        
        angular.forEach($scope.model.selectedProgram.programStages[0].programStageDataElements, function(prStDe){
            $scope.saveRole( prStDe.dataElement.id );
        });        
    };
    
    /*function processCompletness( orgUnit, multiOrgUnit, isSave ){
        if( multiOrgUnit ){
            angular.forEach($scope.selectedOrgUnit.c, function(ou){                
                if( isSave ){
                    if( angular.isUndefined( $scope.model.dataSetCompletness) ){
                        $scope.model.dataSetCompletness = {};
                    }
                    $scope.model.dataSetCompletness[ou] = true;
                }
                else{
                    delete $scope.model.dataSetCompletness[ou];
                }
            });
        }
        else{
            if( isSave ){
                $scope.model.dataSetCompletness[orgUnit] = true;
            }
            else{
                delete $scope.model.dataSetCompletness[orgUnit];
            }
        }
    };*/
    
    $scope.saveCompletness = function(orgUnit, multiOrgUnit){
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'mark_complete',
            bodyText: 'are_you_sure_to_save_completeness'
        };

        ModalService.showModal({}, modalOptions).then(function(result){
        	var dsr = {completeDataSetRegistrations: []};
        	if( multiOrgUnit ){
                angular.forEach($scope.selectedOrgUnit.c, function(ou){                
                    dsr.completeDataSetRegistrations.push( {dataSet: $scope.model.selectedDataSet.id, organisationUnit: ou, period: $scope.model.selectedPeriod.id, attributeOptionCombo: $scope.model.selectedAttributeOptionCombo} );
                });
            }
            else{
            	dsr.completeDataSetRegistrations.push( {dataSet: $scope.model.selectedDataSet.id, organisationUnit: $scope.selectedOrgUnit.id, period: $scope.model.selectedPeriod.id, attributeOptionCombo: $scope.model.selectedAttributeOptionCombo} );
            }
        	
            /*CompletenessService.save($scope.model.selectedDataSet.id, 
                $scope.model.selectedPeriod.id, 
                orgUnit,
                $scope.model.selectedAttributeCategoryCombo.id,
                CommonUtils.getOptionIds($scope.model.selectedOptions),
                multiOrgUnit).then(function(response){
                    
                var dialogOptions = {
                    headerText: 'success',
                    bodyText: 'marked_complete'
                };
                DialogService.showDialog({}, dialogOptions);
                //processCompletness(orgUnit, multiOrgUnit, true);                
                //$scope.model.dataSetCompleted = angular.equals({}, $scope.model.dataSetCompletness);
                $scope.model.dataSetCompletness[$scope.model.selectedAttributeOptionCombo] = true;                
                
            }, function(response){
                CommonUtils.errorNotifier( response );
            });*/
        	
        	CompletenessService.saveDsr(dsr).then(function(response){                        
                var dialogOptions = {
                    headerText: 'success',
                    bodyText: 'marked_complete'
                };
                DialogService.showDialog({}, dialogOptions);
                $scope.model.dataSetCompletness[$scope.model.selectedAttributeOptionCombo] = true;                
                
            }, function(response){
                CommonUtils.errorNotifier( response );
            });
        });        
    };
    
    $scope.deleteCompletness = function( orgUnit, multiOrgUnit){
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'mark_incomplete',
            bodyText: 'are_you_sure_to_delete_completeness'
        };

        ModalService.showModal({}, modalOptions).then(function(result){
            
            CompletenessService.delete($scope.model.selectedDataSet.id, 
                $scope.model.selectedPeriod.id, 
                orgUnit,
                $scope.model.selectedAttributeCategoryCombo.id,
                CommonUtils.getOptionIds($scope.model.selectedOptions),
                multiOrgUnit).then(function(response){
                
                var dialogOptions = {
                    headerText: 'success',
                    bodyText: 'marked_incomplete'
                };
                DialogService.showDialog({}, dialogOptions);
                //processCompletness(orgUnit, multiOrgUnit, false);
                //$scope.model.dataSetCompleted = !angular.equals({}, $scope.model.dataSetCompletness);
                $scope.model.dataSetCompletness[$scope.model.selectedAttributeOptionCombo] = false;
                
            }, function(response){
                CommonUtils.errorNotifier( response );
            });
        });        
    };
});
