import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import {EventManager,FieldObject} from "/apogeejs-base-lib/src/apogeeBaseLib.js";
import ScopeManager from "/apogeejs-model-lib/src/lib/ScopeManager.js";
import ScopeHolder from "/apogeejs-model-lib/src/datacomponents/ScopeHolder.js";
import Parent from "/apogeejs-model-lib/src/datacomponents/Parent.js";

/** This is the model. 
 * - runContextLink - The link to the run context is needed to execute commands against future versions of the model
 * such as with asynch actions (and also for the messenger). 
 * - instanceToCopy - if the new instance should be a copy of an existing instance, this
 * argument should be populated. The copy will have the same field values but it will be unlocked 
 * and by default the update fields will be cleared. The event listeners are also cleared.
 * */
export default class Model extends FieldObject {

    constructor(runContextLink,instanceToCopy) {
        //base init
        super("model",instanceToCopy);

        //mixin initialization
        this.eventManagerMixinInit();
        //this is a root for the scope
        this.scopeHolderMixinInit(true);
        this.parentMixinInit(instanceToCopy,CHANGE_CHILDREN_WRITEABLE,DEFAULT_CHILDREN_WRITEABLE);

        this.runContextLink = runContextLink;
        runContextLink.registerModel(this);

        //==============
        //Fields
        //==============
        //Initailize these if this is a new instance
        if(!instanceToCopy) {
            this.setField("name",Model.DEFAULT_MODEL_NAME);
            this.setField("impactsMap",{});
            //create the object map, with the model included
            let objectMap = {};
            objectMap[this.getId()] = this;
            this.setField("objectMap",objectMap);
        }

        //==============
        //Working variables
        //==============
        this.workingImpactsMap = null;
        this.workingObjectMap = null;
        this.workingChangeMap = {};

        //add a change map entry for this object
        this.workingChangeMap[this.getId()] = {action: instanceToCopy ? "updated" : "created", instance: this};

        // This is a queue to hold actions while one is in process.
        this.actionInProgress = false;
        this.messengerActionList = [];
        this.consecutiveActionCount = 0;
        this.activeConsecutiveActionLimit = Model.CONSECUTIVE_ACTION_INITIAL_LIMIT;
    }

    /** This method returns a mutable copy of this instance. If the instance is already mutable
     * it will be returned rather than making a new one.  */
    getMutableModel(runContextLink) {
        if(this.getIsLocked()) {
            //create a new instance that is a copy of this one
            let newModel = new Model(runContextLink,this);

            //update the object map for the new model
            let newObjectMap = {};
            let oldObjectMap = newModel.getField("objectMap");
            Object.assign(newObjectMap,oldObjectMap);
            newObjectMap[newModel.getId()] = newModel;
            newModel.setField("objectMap",newObjectMap);

            return newModel;
        }
        else if(this.getRunContextLink() == runContextLink) {
            //already unlocked
            //we expect/require the run context should be the same. But test it and throw an error if it is not.
            return this;
        }
        else {
            throw new Error("Unknown run context change in model!");
        }
    }

    /** This method checks if the passed run context is the one that is currently held in this model,
     * returning true if so and false otherwise. */
    getRunContextLink() {
        return this.runContextLink;
    }

    /** This gets a copy of the model where any unlocked members are replaced with new instance copies.
     * This ensures if we look up a mutable member from here we get a different instance from what was 
     * in our original model instance. */
    getCleanCopy(newRunContextLink) {
        //make sure the stored fields are up to date
        if(this.workingImpactsMap) this.finalizeImpactsMap();
        if(this.workingObjectMap) this.finalizeObjectMap();

        let newModel = new Model(newRunContextLink,this);

        //update the object map for the new model
        let oldObjectMap = this.getField("objectMap");

        newModel._populateWorkingObjectMap();
        newModel.workingObjectMap[newModel.getId()] = newModel;

        for(let objectId in oldObjectMap) {
            let object = oldObjectMap[objectId];
            if((object != this)&&(!object.getIsLocked())) {
                //create a new copy of this member and register it.
                let newMember = new object.constructor(object.getName(),object);
                newModel.workingObjectMap[newMember.getId()] = newMember;
            }
        }

        return newModel;
    }
    
    /** This method locks all object instances and the model instance. */
    lockAll() {
        //clear up working fields
        this.workingChangeMap = null;

        //make sure the other working fields have been saved
        if(this.workingImpactsMap) this.finalizeImpactsMap();
        if(this.workingObjectMap) this.finalizeObjectMap();

        //object map includes all objects and the model
        let objectMap = this.getField("objectMap");
        for(let id in objectMap) {
            //this will lock the model too
            //we maybe shouldn't be modifying the objects in place, but we will do it anyway
            objectMap[id].lock();
        }
    }

    /** This completes any lazy initialization. This must be done before the model and the members are locked. 
     * Any member not yet initialized would be a lazy initialize function that was neever called. */
    // completeLazyInitialization() {
    //     //object map includes all members and the model
    //     let activeObjectMap = this._getActiveObjectMap();
    //     for(let id in activeObjectMap) {
    //         let object = activeObjectMap[id];
    //         if(object.lazyInitializeIfNeeded) {
    //             object.lazyInitializeIfNeeded();
    //         }
    //     }
    // }

    /** This shoudl be called after all dependencies have been updated to store the
     * impacts map (We kept a mutable working copy during construction for efficiency)  */
    finalizeImpactsMap() {
        if(this.workingImpactsMap) {
            this.setField("impactsMap",this.workingImpactsMap);
            this.workingImpactsMap = null;
        } 
    }

    finalizeObjectMap() {
        if(this.workingObjectMap) {
            this.setField("objectMap",this.workingObjectMap);
            this.workingObjectMap = null;
        }
    }

    /** This returns a map of the changes to the model. It is only valid while the 
     * model instance is unlocked. */
    getChangeMap() {
        return this.workingChangeMap;
    }

    /** This function should be used to execute any action that is run asynchronously with the current
     * action. The action is run on a model and it is uncertain whether the existing model will still be 
     * current when this new action is run. An example of when this is used is to populate a data member in
     * response to a json request completing.  */
    doFutureAction(actionData) {
        //run this action asynchronously
        this.runContextLink.futureExecuteAction(this.getId(),actionData);
    }

    /** This method returns the root object - implemented from RootHolder.  */
    setName(name) {
        this.setField("name",name);
    }

    /** This method returns the root object - implemented from RootHolder.  */
    getName() {
        return this.getField("name");
    }

    /** This method updates the dependencies of any children
     * based on an object being added. */
    updateDependeciesForModelChange(additionalUpdatedMembers) {
        //call update in children
        let childIdMap = this.getChildIdMap();
        for(var name in childIdMap) {
            var childId = childIdMap[name];
            let child = this.lookupObjectById(childId);
            if((child)&&(child.isDependent)) {
                child.updateDependeciesForModelChange(this,additionalUpdatedMembers);
            }
        }
    }

    //------------------------------
    // Queded Action Methods
    //------------------------------

    /** This function triggers the action for the queued action to be run when the current thread exits. */
    isActionInProgress() {
        return this.actionInProgress;
    }

    setActionInProgress(inProgress) {
        this.actionInProgress = inProgress;
    }

    saveMessengerAction(actionInfo) {
        this.messengerActionList.push(actionInfo);
    }

    getSavedMessengerAction() {
        if(this.messengerActionList.length > 0) {
            var actionData = {};
            actionData.action = "compoundAction";
            actionData.actions = this.messengerActionList;
            this.messengerActionList = []
            return actionData;
        }
        else {
            return null;
        }
    }

    /** This method should be called for each consecutive queued action. It checks it if there are 
     * too many. If so, it returns true. In so doing, it also backs of the consecutive queued 
     * action count so next time it will take longer. Any call to clearConsecutiveQueuedActionCount
     * will return it to the default initial value.
     */
    checkConsecutiveQueuedActionLimitExceeded() {
        this.consecutiveActionCount++;
        
        //check the limit
        var exceedsLimit = (this.consecutiveActionCount > this.activeConsecutiveActionLimit);
        if(exceedsLimit) {
            //back off limit for next time
            this.activeConsecutiveActionLimit *= 2;
        }
        
        return exceedsLimit;
    }

    /** This should be called when there is not a queued action. */
    clearConsecutiveQueuedTracking() {
        this.consecutiveActionCount = 0;
        this.activeConsecutiveActionLimit = Model.CONSECUTIVE_ACTION_INITIAL_LIMIT;
    }

    /** This method resets the command queue */
    clearCommandQueue() {
        //reset queued action variables
        this.messengerActionList = [];
        this.clearConsecutiveQueuedTracking();
    }


    //------------------------------
    // Parent Methods
    //------------------------------

    /** this method gets the hame the children inherit for the full name. */
    getPossesionNameBase(model) {
        //the name starts over at a new model
        return "";
    }

    //------------------------------
    //ScopeHolder methods
    //------------------------------

    /** This method retrieve creates the loaded scope manager. */
    createScopeManager() {
        //set the scope manager
        var scopeManager = new ScopeManager(this);

        //add an entry for this folder. This is for multiple folders in the model base
        //which as of the time of this comment we don't have but plan on adding
        //(at which time this comment will probably be left in by accident...)
        var myEntry = {};
        myEntry.scopeHolderAsParent = true;
        scopeManager.addToScopeList(myEntry);
        
        return scopeManager;
    }

    //============================
    // ObjectMap Functions
    //============================

    /** This returns the member or the model given by the id */
    lookupObjectById(objectId) {
        let activeObjectMap = this._getActiveObjectMap()
        return activeObjectMap[objectId];
    }

    /** This method returns a mutable member for the given ID. If the member is already unlocked, that member will be
     * returned. Otherwise a copy of the member will be made and stored as the active instance for the member ID.  */
    getMutableMember(memberId) {
        if(this.getIsLocked()) throw new Error("The model must be unlocked to get a mutable member.");
        
        //this should not be called to get a mutable copy of the model
        if(memberId == this.getId()) throw new Error("Given ID is not a member ID!");

        let member = this.lookupObjectById(memberId);
        if(member) {
            if(member.getIsLocked()) {
                //create a unlocked copy of the member
                let newMember = new member.constructor(member.getName(),member);

                //update the saved copy of this member in the member map
                this.registerMember(newMember);
                return newMember;
            }
            else {
                return member;
            }
        }
        else {
            return null;
        }
    }

    /** This method returns a mutable copy of the given object. It will either run the function
     * getMutableMember, creating a mutable instance, or it will return the model instance if it is 
     * mutable. This will throw an error if the model is not mutable. This is used in cases where the model
     * should already have been made mutable, such as from within an action. */
    getMutableParent(objectId) {
        if(objectId == this.getId()) {
            if(this.getIsLocked()) {
                throw new Error("The model is locked!");
            }
            else {
                return this;
            }
        }
        else {
            return this.getMutableMember(objectId);
        }
    }

    registerMember(member) {
        if(!this.workingObjectMap) {
            this._populateWorkingObjectMap();
        }

        let memberId = member.getId();

        //update the change map for this member change
        let changeMapEntry = this.workingChangeMap[memberId];
        if(!changeMapEntry) {
            //if it already existed we don't need to change it (that means it was a create and we want to keep that)
            //otherwise add a new entry
            if(this.workingObjectMap[memberId]) {
                //this is an update
                this.workingChangeMap[memberId] = {action: "updated", instance: member};
            }
            else {
                //this is a create
                this.workingChangeMap[memberId] = {action: "created", instance: member};
            }
        }

        //add or update the member in the working member map
        this.workingObjectMap[memberId] = member;
    }

    unregisterMember(member) {
        if(!this.workingObjectMap) {
            this._populateWorkingObjectMap();
        }

        let memberId = member.getId();

        //update the change map for this member change
        let changeMapEntry = this.workingChangeMap[memberId];
        if(changeMapEntry) {
            if(changeMapEntry.action == "updated") {
                changeMapEntry.action = "deleted";
            }
            else if(changeMapEntry.action == "created") {
                //these cancel! however, we will keep the entry around and label
                //it as "transient", in case we get another entry for this member
                //I don't think we should get on after delete, but just in case
                changeMapEntry.action = "transient";
            }
            else if(changeMapEntry.action == "transient") {
                //no action
            }
            else {
                //this shouldn't happen. We will just mark it as delete
                changeMapEntry.action = "deleted"
            }
        }
        else {
            changeMapEntry = {action: "deleted", instance: member};
            this.workingChangeMap[memberId] = changeMapEntry;
        }

        //remove the member entry
        delete this.workingObjectMap[memberId];
    }

    /** This should be called to get a copy of the active working map when no changes are being
     * made to the map. If changes are being made, typically they should be done to the workingObjectMap.  */
    _getActiveObjectMap() {
        return this.workingObjectMap ? this.workingObjectMap : this.getField("objectMap");
    }

    /** This method makes a mutable copy of the object map, and places it in the working object map. */
    _populateWorkingObjectMap() {
        let objectMap = this.getField("objectMap");
        let newObjectMap = {};
        Object.assign(newObjectMap,objectMap);
        this.workingObjectMap = newObjectMap;
    }

    //============================
    // Impact List Functions
    //============================

    /** This returns an array of members this object impacts. */
    getImpactsList(member) {
        let impactsMap = this.getField("impactsMap");
        let impactsList = impactsMap[member.getId()];
        if(!impactsList) impactsList = [];
        return impactsList;
    }
    
    /** This method adds a member to the imapacts list for this object.
     * The return value is true if the member was added and false if it was already there. */
    addToImpactsList(depedentMemberId,memberId) {
        //don't let a member impact itself
        if(memberId === depedentMemberId) return;

        let workingImpactsList = this._getWorkingImpactsList(memberId);

        //add to the list iff it is not already there
        if(workingImpactsList.indexOf(depedentMemberId) === -1) {
            workingImpactsList.push(depedentMemberId);
            return true;
        }
        else {
            return false;
        }
    }

    /** This method removes a member from the imapacts list for this object. */
    removeFromImpactsList(depedentMemberId,memberId) {

        let workingImpactsList = this._getWorkingImpactsList(memberId);

        //it should appear only once
        for(var i = 0; i < workingImpactsList.length; i++) {
            if(workingImpactsList[i] == depedentMemberId) {
                workingImpactsList.splice(i,1);
                return;
            }
        }
    }
    
    /** This gets a editable copy of a impacts list.  
     * @private */
    _getWorkingImpactsList(memberId) {
        //make sure our working impacts map is populated
        //we will use this wile buildign the impacts map and then set the impacts map field
        if(!this.workingImpactsMap) {
            this._populateWorkingImpactsMap();
        }

        let memberImpactsList = this.workingImpactsMap[memberId];
        if(!memberImpactsList) {
            memberImpactsList = [];
            this.workingImpactsMap[memberId] = memberImpactsList;
        }

        return memberImpactsList;
    }

    /** This method will load a mutable copy of the impacts map field to be used
     * when we update the impacts map. We use a working variable since the reconstruction
     * spans many calls to the add/remove function. In the copy, it makes a shallow copy of 
     * each impacts list in the map. */
    _populateWorkingImpactsMap() {
        let impactsMap = this.getField("impactsMap");
        let newImpactsMap = {};
        for(let idString in impactsMap) {
            let impactsList = impactsMap[idString];
            //shallow copy each array
            newImpactsMap[idString] = [...impactsList];
        }
        this.workingImpactsMap = newImpactsMap;
    }

    //============================
    // Save and Load Functions
    //============================

    /** This saves the model */
    toJson() {
        let json = {};
        json.fileType = Model.SAVE_FILE_TYPE;
        json.version = Model.SAVE_FILE_VERSION;

        json.name = this.getField("name");
        json.children = {};
        let childIdMap = this.getField("childIdMap");
        for(var name in childIdMap) {
            var childId = childIdMap[name];
            let child = this.lookupObjectById(childId);
            if(child) {
                json.children[name] = child.toJson(this);
            }
        }

        return json;
    }

    /** This method creates a headless model json from a folder json. It
     * is used in the folder function. */
    static createModelJsonFromFolderJson(name,folderJson) {
        let json = {};
        json.fileType = Model.SAVE_FILE_TYPE;
        json.version = Model.SAVE_FILE_VERSION;

        //let the workspace inherit the folder name
        json.name = name;
        json.children = {};

        //attach a single child named main
        json.children[folderJson.name] = folderJson;

        return json
    }

    //================================
    // Member generator functions
    //================================

    /** This methods retrieves the member generator for the given type. */
    static getMemberTypeConfig(typeName) {
        return memberTypeConfigs[typeName];
    }

    /** This method registers the member generator for a given named type. */
    static registerTypeConfig(typeConfig) {
        memberTypeConfigs[typeConfig.type] = typeConfig;
    }

    /** This method registers the member generator for a given named type. */
    static removeMemberTypeConfig(typeName) {
        delete memberTypeConfigs[typeName];
    }

}

//add mixins to this class
apogeeutil.mixin(Model,EventManager);
apogeeutil.mixin(Model,ScopeHolder);
apogeeutil.mixin(Model,Parent);

const CHANGE_CHILDREN_WRITEABLE = false;
const DEFAULT_CHILDREN_WRITEABLE = true;

let memberTypeConfigs = {};

Model.DEFAULT_MODEL_NAME = "Workspace";
Model.ROOT_FOLDER_NAME = "main";

/** This is the supported file type. */
Model.SAVE_FILE_TYPE = "apogee model";

/** This is the supported file version. */
Model.SAVE_FILE_VERSION = "1.0";

Model.CONSECUTIVE_ACTION_INITIAL_LIMIT = 500;

Model.EMPTY_MODEL_JSON = {
    "fileType": Model.SAVE_FILE_TYPE,
    "version": Model.SAVE_FILE_VERSION,
    "name": Model.DEFAULT_MODEL_NAME,
    "children": {
        "main": {
            "name": Model.ROOT_FOLDER_NAME,
            "type": "apogee.Folder"
        }
    }
}

