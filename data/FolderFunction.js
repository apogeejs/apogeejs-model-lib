import base from "/apogeeutil/base.js";
import {doAction} from "/apogee/actions/action.js";
import Model from "/apogee/data/Model.js";
import ContextManager from "/apogee/lib/ContextManager.js";
import DependentMember from "/apogee/datacomponents/DependentMember.js";
import ContextHolder from "/apogee/datacomponents/ContextHolder.js";
import Parent from "/apogee/datacomponents/Parent.js";

/** This is a folderFunction, which is basically a function
 * that is expanded into data objects. */
export default class FolderFunction extends DependentMember {

    constructor(name,parentId,instanceToCopy,keepUpdatedFixed) {
        super(name,parentId,instanceToCopy,keepUpdatedFixed);

        //mixin init where needed
        //this is a root for the context. Internal members can NOT see what is outside.
        //Any external values must be passed in as arguments.
        this.contextHolderMixinInit(true);
        this.parentMixinInit(instanceToCopy);

        //==============
        //Fields
        //==============
        //Initailize these if this is a new instance
        if(!instanceToCopy) {
            //set to an empty function
            this.setData(function(){});
        }

        //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        this.temporaryVirtualModelRunContext = {
            doFutureAction: function(modelId,actionData) {
                let msg = "NOT IPLEMENTED: Asynchronous actions in folder function!"
                alert(msg);
                throw new Error(msg);
            }
        }
        //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
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

    /** This method creates a member from a json. It should be implemented as a static
     * method in a non-abstract class. */ 
    static fromJson(parentId,json) {
        let member = new FolderFunction(json.name,parentId);

        //set initial data
        let initialData = json.updateData;
        let argList = ((initialData)&&(initialData.argList !== undefined)) ? initialData.argList : [];
        member.setField("argList",argList);
        let returnValueString = ((initialData)&&(initialData.returnValue !== undefined)) ? initialData.returnValue : [];
        member.setField("returnValue",returnValueString);
        
        return member;
    }

    /** This method adds any additional data to the json saved for this member. 
     * @protected */
    addToJson(model,json) {
        json.updateData = {};
        json.updateData.argList = this.getField("argList");
        json.updateData.returnValue = this.getField("returnValue");
        json.children = {};
        let childIdMap = this.getChildIdMap();
        for(var name in childIdMap) {
            var childId = childIdMap[name];
            let child = model.lookupMemberById(childId);
            if(child) {
                json.children[name] = child.toJson(model);
            }
        }
    }

    /** This method extends the base method to get the property values
     * for the property editting. */
    static readProperties(member,values) {
        var argList = member.getArgList();
        var argListString = argList.toString();
        values.argListString = argListString;
        values.returnValueString = member.getReturnValueString();
        return values;
    }

    /** This method executes a property update. */
    static getPropertyUpdateAction(folderFunction,newValues) {
        let updateData = newValues.updateData;
        if((updateData)&&((updateData.argList !== undefined)||(updateData.returnValue !== undefined))) {

            var argList = updateData.argList ? updateData.argList : folderFunction.argList;
            var returnValueString = updateData.returnValue ? updateData.returnValue : folderFunction.returnValueString;
    
            var actionData = {};
            actionData.action = "updateFolderFunction";
            actionData.memberId = folderFunction.getId();
            actionData.argList = argList;
            actionData.returnValueString = returnValueString;
            return actionData;
        }    
        else {
            return null;
        }
    }

    //-------------------------------
    // Dependent Methods
    //-------------------------------
        

    /** If this is true the member must be executed. */
    memberUsesRecalculation() {
        return true;
    }

    /** This updates the member data based on the function. It returns
     * true for success and false if there is an error.  */
    calculate(model) {  
        //make sure the data is set in each impactor
        this.initializeImpactors(model);

        let state = this.getState();
        if((state != apogeeutil.STATE_ERROR)&&(state != apogeeutil.STATE_PENDING)&&(state != apogeeutil.STATE_INVALID)) {
            //check for code errors, if so set a data error
            try {
                var folderFunctionFunction = this.getFolderFunctionFunction(model);
                this.setData(folderFunctionFunction);
            }
            catch(error) {
                //error in calculation
                this.setError(error);
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
            let child = model.lookupMemberById(childId);
            if((child)&&(child.isDependent)) {
                child.updateDependeciesForModelChange(model,additionalUpdatedMembers);
            }
        }
    }

    //------------------------------
    //ContextHolder methods
    //------------------------------

    /** This method retrieve creates the loaded context manager. */
    createContextManager() {
        return new ContextManager(this);

        //we do not provide a parent entry for this context manager because the contents of the
        //folder function are NOT accessible to outside members.
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

    /** This method updates the table data object in the folder data map. 
     * @private */
    calculateDependents(model) {
        let dependsOnMap = [];
        let childIdMap = this.getChildIdMap();
        for(var name in childIdMap) {
            var childId = childIdMap[name];
            dependsOnMap[childId] = apogeeutil.NORMAL_DEPENDENCY;
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
        var virtualModel;
        var inputElementArray;
        var returnValueTable; 
        
        var initialized = false;
        
        var folderFunctionFunction = (...argumentArray) => {
            
            if(!initialized) {
                //create a copy of the model to do the function calculation - we don't update the UI display version
                virtualModel = this.createVirtualModel(model);
        
        //HANDLE THIS ERROR CASE DIFFERENTLY!!!
                if(!virtualModel) {
                    return null;
                }

                //lookup elements from virtual model
                let virtualInternalFolder = virtualModel.getMemberByFullName(virtualModel,"body");
                inputElementArray = this.loadInputElements(virtualModel,virtualInternalFolder);
                returnValueTable = this.loadOutputElement(virtualModel,virtualInternalFolder); 
                
                initialized = true;
            }
            
            //create an update array to set the table values to the elements  
            var updateActionList = [];
            for(var i = 0; i < inputElementArray.length; i++) {
                var entry = {};
                entry.action = "updateData";
                entry.memberId = inputElementArray[i].getId();
                entry.data = argumentArray[i];
                updateActionList.push(entry);
            }
            
            var actionData = {};
            actionData.action = "compoundAction";
            actionData.actions = updateActionList;

            //apply the update
            var actionResult = doAction(virtualModel,actionData);        
            if(actionResult.actionDone) {
                //retrieve the result
                if(returnValueTable) {
                    
                    if(returnValueTable.getState() == apogeeutil.STATE_PENDING) {
                        throw new Error("A folder function must not be asynchronous: " + this.getFullName(virtualModel));
                    }
                    
                    return returnValueTable.getData();
                }
                else {
                    //no return value found
                    return undefined;
                }
            }
            else {
                let errorMsg = actionResult.errorMsg ? actionResult.errorMsg : "Unknown error evaluating Folder Function " + this.getName();
                throw new Error(errorMsg);
            }
        }
        
        return folderFunctionFunction;    
    }

    /** This method creates a copy of the model to be used for the function evvaluation. 
     * @private */
    createVirtualModel(model) {
        let internalFolder = this.getInternalFolder(model);
        var folderJson = internalFolder.toJson(model);
        var modelJson = Model.createModelJsonFromFolderJson(this.getName(),folderJson);
        var virtualModel = new Model(this.temporaryVirtualModelRunContext);

        //load the model
        let loadAction = {};
        loadAction.action = "loadModel";
        loadAction.modelJson = modelJson;
        let actionResult = doAction(virtualModel,loadAction);
        
        //do something with action result!!!
        
        return virtualModel;
    }

    /** This method loads the input argument members from the virtual model. 
     * @private */
    loadInputElements(virtualModel,virtualInternalFolder) {
        let argMembers = [];
        let argList = this.getField("argList");
        for(var i = 0; i < argList.length; i++) {
            var argName = argList[i];
            var argMember = virtualInternalFolder.lookupChild(virtualModel,argName);
            if(argMember) {
                argMembers.push(argMember);
            }     
        }
        return argMembers;
    }

    /** This method loads the output member from the virtual model. 
     * @private  */
    loadOutputElement(virtualModel,virtualInternalFolder) {
        let returnValueString = this.getField("returnValue");
        var returnValueMember = virtualInternalFolder.lookupChild(virtualModel,returnValueString);
        return returnValueMember;
    }
}

//add components to this class
base.mixin(FolderFunction,ContextHolder);
base.mixin(FolderFunction,Parent);

FolderFunction.INTERNAL_FOLDER_NAME = "body";

        
//============================
// Static methods
//============================

FolderFunction.generator = {};
FolderFunction.generator.displayName = "Folder Function";
FolderFunction.generator.type = "apogee.FolderFunction";
FolderFunction.generator.createMember = FolderFunction.fromJson;
FolderFunction.generator.readProperties = FolderFunction.readProperties;
FolderFunction.generator.getPropertyUpdateAction = FolderFunction.getPropertyUpdateAction;
FolderFunction.generator.setDataOk = false;
FolderFunction.generator.setCodeOk = false;

//register this member
Model.addMemberGenerator(FolderFunction.generator);




