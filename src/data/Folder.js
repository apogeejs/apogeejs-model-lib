import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import Model from "/apogeejs-model-lib/src/data/Model.js";
import DependentMember from "/apogeejs-model-lib/src/datacomponents/DependentMember.js";
import ScopeHolder from "/apogeejs-model-lib/src/datacomponents/ScopeHolder.js";
import ScopeManager from "/apogeejs-model-lib/src/lib/ScopeManager.js";
import Parent from "/apogeejs-model-lib/src/datacomponents/Parent.js";

/** This is a folder. */
export default class Folder extends DependentMember {

    constructor(name,instanceToCopy,typeConfig,specialCaseIdValue) {
        super(name,instanceToCopy,typeConfig,specialCaseIdValue);

        //mixin init where needed
        //This is not a root. Scope is inherited from the parent.
        this.scopeHolderMixinInit(false);
        let instanceTypeConfig = this.getTypeConfig();
        this.parentMixinInit(instanceToCopy,instanceTypeConfig.changeChildrenWriteable,instanceTypeConfig.defaultChildrenWriteable);
    }

    //------------------------------
    // Parent Methods
    //------------------------------

    /** In this implementation updates the dependencies and updates the data value for the folder. See notes on why the update is
     * done here rather than in 'calculate' */
    onAddChild(model,child) {
        //set all children as dependents
        let dependsOnMap = this.calculateDependents(model);
        this.updateDependencies(model,dependsOnMap);

        //recalculate data and state
        let name = child.getName();
        let data = child.getData();
        let newDataMap = this._getSplicedDataMap(model,name,data);
        let {state, error} = this.calculateDependentState(model,false);

        //set the new state and data
        this.setStateAndData(model,state,newDataMap,error,true)
    }

    /** In this implementation updates the dependencies and updates the data value for the folder. See notes on why the update is
     * done here rather than in 'calculate' */
    onRemoveChild(model,child) {
        //set all children as dependents
        let dependsOnMap = this.calculateDependents(model);
        this.updateDependencies(model,dependsOnMap);

        //recalculate data and state
        let name = child.getName();
        let newDataMap = this._getSplicedDataMap(model,name);
        let {state, error} = this.calculateDependentState(model,false);

        //set the new state and data
        this.setStateAndData(model,state,newDataMap,error,true);
    }

    /** In this implementation we update the data value for the folder. See notes on why this is
     * done here rather than in 'calculate' */
    onChildDataUpdate(model,child) {
        let childId = child.getId();
        let childIdMap = this.getChildIdMap();
        let name = child.getName();
        if(childIdMap[name] != childId) {
            apogeeUserAlert("Error - the member " + childId + " is not registered in the parent under the name "  + name);
            return;
        }

        //get new data
        let data = child.getData();
        let newDataMap = this._getSplicedDataMap(model,name,data);
        //calculate dependent state but do not set it yet
        let {state, error} = this.calculateDependentState(model,false);

        //here we will always set the data whether or not there are any issues in dependents
        this.setStateAndData(model,state,newDataMap,error,true);
    }

    /** this method gets the hame the children inherit for the full name. */
    getPossesionNameBase(model) {
        return this.getFullName(model) + ".";
    }

    //------------------------------
    // Dependent Methods
    //------------------------------

    /** This usually calculates the value of the member. However, in the case of a folder the value is already updated
     * once we initialize the impactors. We update the value incrementally so that we do not need to calculate all children
     * before any data is read from the folder. If we waited, we would get a circular dependecy if we trie to specify the 
     * name of a member including the path to it. We need to allow this to avoid name colisions at times.  */
    calculate(model) {
        //make sure the data is set in each impactor
        this.initializeImpactors(model);
        
        //see note in method description - no calculation is done here. It is done incrementally as children are calculated.
        //BUT if there was no update of children since prepare for calculate,
        //we will recalculate state and reset current value.
        if(this.getState() == apogeeutil.STATE_NONE) {
            //get new data
            let data = this.getData();
            let {state, error} = this.calculateDependentState(model,false);
            if(state == apogeeutil.STATE_NONE) state = apogeeutil.STATE_NORMAL;

            //here we will always set the data whether or not there are any issues in dependents
            this.setStateAndData(model,state,data,error,true);
        }

        //clear calc pending flag
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
            let childId = childIdMap[name];
            var child = model.lookupObjectById(childId);
            if((child)&&(child.isDependent)) {
                child.updateDependeciesForModelChange(model,additionalUpdatedMembers);
            }
        }
    }

    //------------------------------
    // Member Methods
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

    //============================
    // Private methods
    //============================

    /** This method calculates the dependencies for this folder. 
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

    /** This does a partial update of the folder value, for a single child */
    _getSplicedDataMap(model,addOrRemoveName,addData) {
        //shallow copy old data
        let oldDataMap = this.getData();
        let newDataMap = {};
        Object.assign(newDataMap,oldDataMap);

        //add or update this child data
        if(addData !== undefined) {
            newDataMap[addOrRemoveName] = addData;
        }
        else {
            delete newDataMap[addOrRemoveName];
        }
        
        //make this immutable and set it as data for this folder - note we want to set the data whether or not we have an error!
        Object.freeze(newDataMap);
        return newDataMap;
    }

}




//add components to this class                     
apogeeutil.mixin(Folder,ScopeHolder);
apogeeutil.mixin(Folder,Parent);

/** This function creates a new instance */ 
function createMember(model,json) {
    var folder = new Folder(json.name,null,TYPE_CONFIG,json.specialCaseIdValue);

    let dataMap = {};
    Object.freeze(dataMap);
    folder.setData(model,dataMap);

    folder.loadChildMetadata(json);

    return folder;
}

const TYPE_CONFIG = {
    type: "apogee.Folder",
    createMember: createMember,
    changeChildrenWriteable: true,
    defaultChildrenWriteable: true
}

Model.registerTypeConfig(TYPE_CONFIG);

