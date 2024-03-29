import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import {doAction} from "/apogeejs-model-lib/src/actions/action.js";
import Model from "/apogeejs-model-lib/src/data/Model.js";
import ScopeManager from "/apogeejs-model-lib/src/lib/ScopeManager.js";
import DependentMember from "/apogeejs-model-lib/src/datacomponents/DependentMember.js";
import ScopeHolder from "/apogeejs-model-lib/src/datacomponents/ScopeHolder.js";
import Parent from "/apogeejs-model-lib/src/datacomponents/Parent.js";
import ModelRunContextLink from "/apogeejs-model-lib/src/actions/ModelRunContextLink.js";

/** This is a folderFunction, which is basically a function
 * that is expanded into data objects. */
export default class FolderFunction extends DependentMember {

    constructor(name,instanceToCopy,typeConfig,specialCaseIdValue) {
        super(name,instanceToCopy,typeConfig,specialCaseIdValue);

        //mixin init where needed
        this.scopeHolderMixinInit();
        this.parentMixinInit(instanceToCopy,false,false);

        //==============
        //Fields
        //==============
        //Initailize these if this is a new instance
        if(!instanceToCopy) {
            //this field is used to disable the calculation of the value of this function
            //It is used in the "virtual model" to prevent any unnecessary downstream calculations
            this.setField("sterilized",false)
        }
    }

    /** This gets the internal forlder for the folderFunction. */
    getInternalFolder(model) {
        return this.lookupChild(model,"body");
    }

    /** This gets the name of the return object for the folderFunction function. */
    getReturnValueString() {
        return this.getField("returnValue");
    }

    /** This gets the arg list of the folderFunction function. */
    getArgList() {
        return this.getField("argList");
    }

    //------------------------------
    // Member Methods
    //------------------------------

    getFieldsJsonData() {
        let fields = {};
        fields.argList = this.getField("argList");
        fields.returnValue = this.getField("returnValue");
        return fields;
    }

    loadFieldsForCreate(model,initialData) {
        let argList = ((initialData)&&(initialData.argList !== undefined)) ? initialData.argList : [];
        this.setField("argList",argList);
        let returnValueString = ((initialData)&&(initialData.returnValue !== undefined)) ? initialData.returnValue : [];
        this.setField("returnValue",returnValueString);
    }

    /** This is used for parents for creating the action for a local property update. (parent method, for a member function) */
    getLocalPropertyUpdateAction(model,newValues) {
        let fields = newValues.fields;
        if((fields)&&((fields.argList !== undefined)||(fields.returnValue !== undefined))) {

            var argList = fields.argList ? fields.argList : this.getArgList();
            var returnValueString = fields.returnValue ? fields.returnValue : this.getReturnValueString();
    
            var actionData = {};
            actionData.action = "updateFolderFunction";
            actionData.memberId = this.getId();
            actionData.argList = argList;
            actionData.returnValue = returnValueString;
            return actionData;
        }    
        else {
            return null;
        }
    }

    //-------------------------------
    // Dependent Methods
    //-------------------------------

    /** This updates the member data based on the function. It returns
     * true for success and false if there is an error.  */
    calculate(model) {  

        //if this function is sterilized, we will just set the value to invalid value.
        //This prevents any object which calls this function from updating. It is inended to be 
        //used in the virtual workspace assoicated with this folder function
        if(this.getField("sterilized")) {
            this.setResultInvalid(model);
            this.clearCalcPending();
            return;
        }

        //make sure the data is set in each impactor
        this.initializeImpactors(model);
        this.calculateDependentState(model,true);

        let state = this.getState();
        if((state != apogeeutil.STATE_ERROR)&&(state != apogeeutil.STATE_PENDING)&&(state != apogeeutil.STATE_INVALID)) {
            //calculate folder function if no issue in dependent
            try {
                var folderFunctionFunction = this.getFolderFunctionFunction(model);
                this.setData(model,folderFunctionFunction);
            }
            catch(error) {
                if(error.stack) console.error(error.stack);
                
                //error in calculation
                this.setError(model,error);
            }
        }
        
        this.clearCalcPending();
    }

    /** This method updates the dependencies of any children
     * based on an object being added. */
    updateDependeciesForModelChange(model,additionalUpdatedMembers) {

        //update dependencies of this folder
        let oldDependsOnMap = this.getDependsOn();
        let newDependsOnMap = this.calculateDependents(model);
        if(!apogeeutil.jsonEquals(oldDependsOnMap,newDependsOnMap)) {
            //if dependencies changes, make a new mutable copy and add this to 
            //the updated values list
            let mutableMemberCopy = model.getMutableMember(this.getId());
            mutableMemberCopy.updateDependencies(model,newDependsOnMap);
            additionalUpdatedMembers.push(mutableMemberCopy);
        }

        //call update in children
        let childIdMap = this.getChildIdMap();
        for(var name in childIdMap) {
            var childId = childIdMap[name];
            let child = model.lookupObjectById(childId);
            if((child)&&(child.isDependent)) {
                child.updateDependeciesForModelChange(model,additionalUpdatedMembers);
            }
        }
    }

    //------------------------------
    //ScopeHolder methods
    //------------------------------

    /** This method retrieve creates the loaded scope manager. */
    createScopeManager() {
        //set the scope manager
        var scopeManager = new ScopeManager(this);
        
        //add an entry for this folder
        var myEntry = {};
        myEntry.scopeHolderAsParent = true;
        scopeManager.addToScopeList(myEntry);
        
        return scopeManager;
    }

    //------------------------------
    //Parent methods
    //------------------------------

    onAddChild(model,child) {
        //set all children as dependents
        let dependsOnMap = this.calculateDependents(model);
        this.updateDependencies(model,dependsOnMap);
    }

    onRemoveChild(model,child) {
        //set all children as dependents
        let dependsOnMap = this.calculateDependents(model);
        this.updateDependencies(model,dependsOnMap);
    }

    /** this method gets the hame the children inherit for the full name. */
    getPossesionNameBase(model) {
        return this.getFullName(model) + ".";
    }

    //============================
    // Private methods
    //============================

    /** This method updates the member data object in the folder data map. 
     * @private */
    calculateDependents(model) {
        let dependsOnMap = [];
        let childIdMap = this.getChildIdMap();
        for(var name in childIdMap) {
            var childId = childIdMap[name];
            dependsOnMap[childId] = true;
        }
        return dependsOnMap;
    }

    /** This is called from the update action. It should not be called externally. */
    setReturnValueString(returnValueString) {
        let existingRVS = this.getField("returnValue");
        if(existingRVS != returnValueString) {
            this.setField("returnValue",returnValueString);
        }
    }

    /** This is called from the update action. It should not be called externally. */
    setArgList(argList) {
        let existingArgList = this.getField("argList");
        if(existingArgList != argList) {
            this.setField("argList",argList);
        }
    }

    /** This method creates the folderFunction function. It is called from the update action 
     * and should not be called externally. 
     * @private */
    getFolderFunctionFunction(model) {

        //create a copy of the model to do the function calculation - we don't update the UI display version
        var baseVirtualModel;
        var inputMemberIdArray;
        var returnValueMemberId; 
        
        var initialized = false;
        
        var folderFunctionFunction = (...argumentArray) => {
            
            if(!initialized) {
                //get the ids of the inputs and outputs. We can use the real instance to look these up since they don't change.
                let internalFolder = this.getInternalFolder(model);
                inputMemberIdArray = this.loadInputElementIds(model,internalFolder);
                returnValueMemberId = this.loadOutputElementId(model,internalFolder); 

                //prepare the virtual function
                //this is a copy of the original model, but with any member that is unlocked replaced.
                //to prevent us from modifying an object in use by our current real model calculation.
                let initRunContext = createRunContext();
                let initRunContextLink = createRunContextLink(initRunContext);
                baseVirtualModel = model.getCleanCopy(initRunContextLink);

                //we want to set the folder function as "sterilized" - this prevents any downstream work from the folder function updating
                //(this is an synchronous command)
                let commandData = {}
                commandData.action = "setField";
                commandData.memberId = this.getId();
                commandData.fieldName = "sterilized";
                commandData.fieldValue = "true";
                let actionResult = doAction(baseVirtualModel,commandData);

                //clean up the run context
                //we should do something with the action result
                if(!actionResult.actionDone) {
                    initRunContextLink.setStateValid(false);
                    throw new Error("Error calculating folder function");
                }
                else {
                    initRunContextLink.setStateValid(true);
                }
                initRunContext.deactivate();
                
                initialized = true;
            }
            
            //create an update array to set the member values for the input elements  
            var updateActionList = [];
            for(var i = 0; i < inputMemberIdArray.length; i++) {
                var entry = {};
                entry.action = "updateData";
                entry.memberId = inputMemberIdArray[i];
                entry.data = argumentArray[i];
                updateActionList.push(entry);
            }
            
            var actionData = {};
            actionData.action = "compoundAction";
            actionData.actions = updateActionList;

            //create the run context for this 
            let functionCallRunContext = createRunContext();
            let runContextLink = createRunContextLink(functionCallRunContext);

            //apply the update
            let instanceVirtualModel = baseVirtualModel.getMutableModel(runContextLink);
            var actionResult = doAction(instanceVirtualModel,actionData);        
            if(actionResult.actionDone) {
                //do the run context update
                runContextLink.setStateValid(true);
                functionCallRunContext.deactivate();

                //retrieve the result
                if(returnValueMemberId) {
                    let returnValueMember = instanceVirtualModel.lookupObjectById(returnValueMemberId);
                    let returnState = returnValueMember.getState();
                    switch(returnState) {
                        case apogeeutil.STATE_NORMAL:
                            return returnValueMember.getData();

                        case apogeeutil.STATE_ERROR:
                            let error = this.getModelError(instanceVirtualModel);
                            throw error;

                        case apogeeutil.STATE_PENDING:
                            throw new Error("Error; asynchrnous functions not supporred!");

                        case apogeeutil.STATE_INVALID:
                            throw apogeeutil.MEMBER_FUNCTION_INVALID_THROWABLE;

                        default:
                            //this shouldn't happen
                            throw new Error("Unknown internal state in function!");
                    }
                }
                else {
                    //no return value found
                    return undefined;
                }
            }
            else {
                //do the run context update
                runContextLink.setStateValid(false);
                functionCallRunContext.deactivate();

                let errorMsg = actionResult.errorMsg ? actionResult.errorMsg : "Unknown error evaluating Folder Function " + this.getName();
                throw new Error(errorMsg);
            }
        }
        
        return folderFunctionFunction;    
    }

    /** This method loads the input argument members from the virtual model. 
     * @private */
    loadInputElementIds(model,internalFolder) {
        let argMembers = [];
        let argList = this.getField("argList");
        for(var i = 0; i < argList.length; i++) {
            var argName = argList[i];
            var argMember = internalFolder.lookupChild(model,argName);
            if(argMember) {
                argMembers.push(argMember.getId());
            }     
        }
        return argMembers;
    }

    /** This method loads the output member from the virtual model. 
     * @private  */
    loadOutputElementId(model,internalFolder) {
        let returnValueString = this.getField("returnValue");
        var returnValueMember = internalFolder.lookupChild(model,returnValueString);
        if(returnValueMember) return returnValueMember.getId();
        else return null;
    }

    /** This method loads any errors from within the folder function. 
     * @private  */
    getModelError(model) {
        let memberMap = model.getField("memberMap");
        let errorMessages = [];
        //load error messages from each non-dependency error in the folder function
        for(let id in memberMap) {
            let member = memberMap[id];
            if((member.isMember)&&(member.getState() == apogeeutil.STATE_ERROR)) {
                let error = member.getError();
                if(!error.isDependsOnError) {
                    let errorDesc = error.message ? error.message : error.toString();
                    errorMessages.push(`Member ${member.getName()}: ${errorDesc}`);
                }
            }
        }
        let errorMsgList = errorMessages.join("; ");
        return new Error(`Error in function call ${this.getName()}: ${errorMsgList}`);
    }
}

//add components to this class
apogeeutil.mixin(FolderFunction,ScopeHolder);
apogeeutil.mixin(FolderFunction,Parent);

FolderFunction.INTERNAL_FOLDER_NAME = "body";

        
/** This function creates a new instance */ 
function createMember(model,json) {
    let member = new FolderFunction(json.name,null,TYPE_CONFIG,json.specialCaseIdValue);

    //set to an empty function
    member.setData(model,function(){});

    //load initial fields data
    member.loadFieldsForCreate(model,json.fields);

    //load parent/child data
    member.loadChildMetadata(json);
    
    return member;
}

const TYPE_CONFIG = {
    type: "apogee.FolderFunction",
    createMember: createMember
}

Model.registerTypeConfig(TYPE_CONFIG);


//////////////////////////////////////////////////////////////////
// These are dummy implementions of the run context for Folder Functions
// For now we do not allow async folder funtions. We will add that though!!!

function createRunContext() {
    return new FolderFunctionRunContext();
}

function createRunContextLink(runContext) {
    return new ModelRunContextLink(runContext);
}

/** This is a dummy run context. It does not allow async functions. */
 class FolderFunctionRunContext {
    constructor() {
        this.isActive = true;
    }

    /** This method should return true if the run context is active and false if it has been stopped. For example, if an application
     * is the run context and it has been closed, this should return false.
     */
     getIsActive() {
        return this.isActive;
    }
    
    deactivate() {
        this.isActive = false;
    }

    getConfirmedModel() {
        return null;
    }

    futureExecuteAction(modelId,actionData) {
        throw new Error("Async actions not allowed in folder function for now!");
    }


};












