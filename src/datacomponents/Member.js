import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import {FieldObject} from "/apogeejs-base-lib/src/apogeeBaseLib.js";

/** This component encapsulates the member functionality for objects in the model.
 * 
 * This is a mixin and not a class. It is used for the prototype of the objects that inherit from it.
 *  
 * COMPONENT DEPENDENCIES:
 * 
 * FIELD NAMES (from update event):
 * - data
 * - name
 * - parent
 * 
 * This class represents a member object. 
 * The parent should be the parent member that holds this member or the object that holds
 * the hierarchy (maybe the model). */
export default class Member extends FieldObject {

    constructor(name,instanceToCopy,typeConfig,specialCaseIdValue) {
        super("member",instanceToCopy,specialCaseIdValue);
        
        //==============
        //Fields
        //==============
        //Initailize these if this is a new instance
        if(!instanceToCopy) {
            this.typeConfig = typeConfig;

            this.setField("name",name);
            //"data"
            //"pendingPromise"
            this.setField("state",apogeeutil.STATE_NONE);
        }
        else {
            this.typeConfig = instanceToCopy.getTypeConfig();
        }
    }

    /** This property tells if this object is a member. */
    get isMember() {
        return true;
    }

    /** this method gets the name. */
    getName() {
        return this.getField("name");
    }

    /** This method returns the full name in dot notation for this object. */
    getFullName(model) {
        let name = this.getField("name");
        let parentId = this.getField("parentId");
        if(parentId) {
            let parent = model.lookupObjectById(parentId);
            if(parent) {
                return parent.getChildFullName(model,name);
            }
        }
        
        //if we get here there is no parent
        return name;
    }

    /** This returns true if the full name changes. */
    isFullNameUpdated(model) {
        if(this.areAnyFieldsUpdated(["name","parentId"])) {
            return true;
        }
        else {
            let parent = this.getParent(model);
            if((parent)&&(parent.isMember)) {
                return parent.isFullNameUpdated(model); 
            } 
            else {
                //if the parent is the model, we don't need to check the full name 
                return false;
            }
        }
    }

    getParentId() {
        return this.getField("parentId");
    }

    /** This returns the parent for this member. */
    getParent(model) {
        let parentId = this.getField("parentId");
        return model.lookupObjectById(parentId);
    }

    /** This returns the parent for this member. For the root folder
     * this value is null. */
    getParentMember(model) {
        let parentId = this.getField("parentId");
        if(parentId) {
            let parent = model.lookupObjectById(parentId);
            if((parent)&&(parent instanceof Member)) {
                return parent;
            }
        }

        //if we get here, there is no parent
        return null;
    }

    getTypeConfig() {
        return this.typeConfig;
    }

    //================================================
    // Serialization Methods
    //================================================

    /** This method writes the child to a json. */
    toJson(model) {
        var json = {};
        json.name = this.getField("name");
        json.type = this.typeConfig.type;
        
        if(this.getFieldsJsonData) {
            let fields = this.getFieldsJsonData();
            if(fields != undefined) {
                json.fields = fields;
            }
        }

        if((this.isParent)&&(this.writeChildData)) {
            this.writeChildData(model,json);
        }
        return json;
    }
    //=======================================
    // Data/State getting functions
    //=======================================

    /** This returns the state struct for the member. */
    getState() {
        let stateStruct = this.getField("state");
        if(stateStruct) { 
            return stateStruct.state;
        }
        else {
            //If this happens, we will just make it state normal 
            throw new Error("INVALID STATE: member " + this.getName());
        }
    }

    /** this method gets the data map. */
    getData() {
        return this.getField("data");
    }

    /** This returns the error object for this member. The entries can be javscript Error objects or other objects with a
     * toString() method. See documentation for some additional properties of these errors. */
    getError() {
        let stateStruct = this.getField("state");
        if(stateStruct) return stateStruct.error;
        else return null;
    }

    /** This method returns a simple error message for this member, if the member is in
     * the error state. Additional information can be obtained by getting the actual error object. */
    getErrorMsg() {
        let stateStruct = this.getField("state");
        if((stateStruct)&&(stateStruct.error)) {
            return stateStruct.error.message ? stateStruct.error.message : stateStruct.error.toString();
        }
        else {
            //this shouldn't happen if the state is actually an error state
            return "";
        }
    }

    /** This method returns the list of error info objects for this member. It should be
     * called only when the state is error. */
    getErrorInfo() {
        let stateStruct = this.getField("state");
        if((stateStruct)&&(stateStruct.error)) return stateStruct.error.errorInfoList;
        else return [];
    }

    /** This method returns the error value data, which is a substitute value to be displayed
     * when the member is in an error state. It should be called only when the state is error. */
    getErrorValueData() {
        let stateStruct = this.getField("state");
        if((stateStruct)&&(stateStruct.error)) return stateStruct.error.valueData;
        else return undefined;
    }

    /** This returns the list of errors. The entries can be javscript Error objects, members (signifying a
     * dependency error), strings or other objects (which should be converted to strings). 
     * @deprecated*/
    getErrors() {
        let stateStruct = this.getField("state");
        if(stateStruct) {
            return [stateStruct.error];
        }
        else {
            //this shouldn't happen if the state is actually an error state
            return [];
        }
    }

    /** This returns the promise that is pending. */
    getPendingPromise() {
        return this.getField("pendingPromise");
    }

    /** This returns true if the pending token matches. */
    pendingPromiseMatches(promise) {
        return (this.getPendingPromise() === promise);
    }

    //=======================================
    // Update Data/State functions
    //=======================================

    /** This method sets the state to none, signifying an invalid state. */
    clearState() {
        this.setField("state",{"state":apogeeutil.STATE_NONE});
    }

    /** This method sets the data for this object. This is the object used by the 
     * code which is identified by this name, for example the JSON object associated
     * with a data member. */
    setData(model,data) {
        this.setStateAndData(model,apogeeutil.STATE_NORMAL,data);
    }

    /** This method adds the following error for this member. It will be valid for the current round of calculation of
     * this member. The error should be a javascript Error object, an apogee Member (signifying a dependnecy
     * error), a string, or another type, which will be interpretted as a string. */
    setError(model,error) {
        this.setStateAndData(model,apogeeutil.STATE_ERROR,apogeeutil.INVALID_VALUE,error);
    }

    /** This method adds the following errors for this member. See setError for more details.
     * @deprecated
    */
    setErrors(model,errorList) {
        //this is probably not used anywhere. If it is we will just keep the first error
        let error;
        if((errorList)&&(errorList.length >= 1)) error = errorList[0];
        this.setStateAndData(model,apogeeutil.STATE_ERROR,apogeeutil.INVALID_VALUE,error);
    }

    /** This sets the result pending flag. The promise triggering the pending state should also be passed if there
     * is one for this member. If the state is pending because it depends on a pending member, the promise should be
     * left as undefined.*/
    setResultPending(model,promise) {
        this.setStateAndData(model,apogeeutil.STATE_PENDING,apogeeutil.INVALID_VALUE);
        if(promise) {
            this.setField("pendingPromise",promise);
        }
    }

    /** This sets the result invalid flag. If the result is invalid, any
     * member depending on this will also have an invalid value. */
    setResultInvalid(model) {
        this.setStateAndData(model,apogeeutil.STATE_INVALID,apogeeutil.INVALID_VALUE);
    }

    /** This methos sets the data, where the data can be a generalized value
     *  include data, apogeeutil.INVALID_VALUE, a Promis or an Error.
     * This method does not however apply the asynchrnous data, it only flags the member as pending.
     * the asynchronous data is set separately (also) using applyAsynchFutureValue, whcih requires access
     * to the model object. */
    applyData(model,data) {

        //handle four types of data inputs
        if(data instanceof Promise) {
            //data is a promise - flag this a pending
            this.setResultPending(model,data);
        }
        else if(data instanceof Error) {
            //data is an error
            this.setError(model,data);
        }
        else if(data === apogeeutil.INVALID_VALUE) {
            //data is an invalid value
            this.setResultInvalid(model);
        }
        else {
            //normal data update (poosibly from an asynchronouse update)
            this.setData(model,data);
        }
    }

    /** This method implements setting asynchronous data on the member using a promise.
     * This does not however set the current pending state. */
    applyAsynchFutureValue(model,promise) {

        //kick off the asynch update
        var asynchCallback = memberValue => {
            //set the data for the member, along with triggering updates on dependent tables.
            let actionData = {};
            actionData.action = "updateData";
            actionData.memberId = this.getId();
            actionData.sourcePromise = promise;
            actionData.data = memberValue;
            doFutureAction(model,actionData);
        }
        var asynchErrorCallback = error => {

            //this must be an error object to be handled properly
            if(!(error instanceof Error)) {
                error = new Error(error.toString());
            }

            let actionData = {};
            actionData.action = "updateData";
            actionData.memberId = this.getId();
            actionData.sourcePromise = promise;
            actionData.data = error;
            doFutureAction(model,actionData);
        }

        //call appropriate action when the promise completes
        promise.then(asynchCallback).catch(asynchErrorCallback);
    }

    
    /** This method updates the state and data. This should not typically be called directly instead the individual
     * data and state setters should be called.
     * The data value will be applied regardless of the state. The error list is applied only if the state is ERROR. */
    setStateAndData(model,state,data,error) {

        //set the state if it is error or if it changes
        let oldStateStruct = this.getField("state");
        if((state == apogeeutil.STATE_ERROR)||(!oldStateStruct)||(state != oldStateStruct.state)) {
            //update the state
            let newStateStruct = {};

            newStateStruct.state = state;
            if(state == apogeeutil.STATE_ERROR) {
                newStateStruct.error = error;
            }
            this.setField("state",newStateStruct);
        }

        //set data as specified
        if(data === undefined) {
            this.clearField("data");
        }
        else {
            this.setField("data",data);
        }

        //clear the pending promise
        //note that the pending promise must be set elsewhere if we are in pending
        if(this.getField("pendingPromise")) {
            this.clearField("pendingPromise");
        }

        //notify parent of update
        let parentId = this.getField("parentId");
        if(parentId) {
            let parent = model.getMutableParent(parentId);
            parent.childDataUpdate(model,this);
        }
    }

    //========================================
    // Move Functions
    //=========================================

    /** This method should be used to rename and/or change 
     * the parent of this member. */
    move(newName,newParent) {
        //update the name if needed
        if(newName != this.getField("name")) {
            this.setField("name",newName);
        }
        
        //update the parent if needed
        let currentParentId = this.getField("parentId");
        if(currentParentId != newParent.getId()) {
            this.setField("parentId",newParent.getId());
        }
    }

    /** This should only be used for intially setting the parent id. */
    setParentId(parentId) {
        this.setField("parentId",parentId);
    }

    //========================================
    // "Protected" Methods
    //========================================

    /** This method is called when the member is deleted. If necessary the implementation
     * can extend this function, but it should call this base version of the function
     * if it does.  
     * @protected */
    onDeleteMember(model) {
    }

    ///** This method is called when the model is closed and also when an object
    // * is deleted. It should do any needed cleanup for the object.  
    // * @protected */
    //onClose();

    //getFieldsJsonData
    //loadFieldsForCreate

    //----------------------------------
    // Error methods
    //----------------------------------

    /** This methos created a depends on error, with a dependency on all members in the passed list. */
    static createDependsOnError(model,errorImpactorList) {
        let dependsOnErrorList = errorImpactorList.map(impactor => {
            return {
                id: impactor.getId(),
                name: impactor.getFullName(model)
            }
        });
        let msgPrefix = (dependsOnErrorList.length === 1) ? "Error in dependency: " : "Error in dependencies: ";
        let errorMsg = msgPrefix + dependsOnErrorList.map(dependsOnEntry => dependsOnEntry.name).join(", ")
        let dependsOnErrorInfo = {
            type: "dependency",
            dependsOnErrorList: dependsOnErrorList
        }
        let dependsOnError = new Error(errorMsg);
        dependsOnError.isDependsOnError = true;
        apogeeutil.appendErrorInfo(dependsOnError,dependsOnErrorInfo);
        return dependsOnError;
    }
}

/** This function executes the action data agains the current model in the given run context. If the
 * model is not an active part of the model run context the action will not be run. */
function doFutureAction(model,actionData) {
    let modelRunContextLink = model.getRunContextLink()
    if(modelRunContextLink.getIsActive()) {
        modelRunContextLink.getModelRunContext().futureExecuteAction(actionData)
    }
}