import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import Member from "/apogeejs-model-lib/src/datacomponents/Member.js";

/** This mixin encapsulates an member whose value depends on another
 * member (or the model). The dependent allows for a recalculation based on an update of the 
 * objects it depends on.
 */
export default class DependentMember extends Member {

    /** This initializes the component */
    constructor(name,instanceToCopy,typeConfig,specialCaseIdValue) {
        super(name,instanceToCopy,typeConfig,specialCaseIdValue);

        //==============
        //Fields
        //==============
        //Initailize these if this is a new instance
        if(!instanceToCopy) {
            //this is the list of dependencies
            this.setField("dependsOnMap",{});
        }

        //==============
        //Working variables
        //==============
        this.calcPending = false;
    }

    /** This property tells if this object is a dependent.
     * This property should not be implemented on non-dependents. */
    get isDependent() {
        return true;
    }

    /** This returns a list of the members that this member depends on. */
    getDependsOn() {
        return this.getField("dependsOnMap");
    }

    /** This returns the calc pending flag.  */
    getCalcPending() {
        return this.calcPending;
    }

    /** This sets the calc pending flag to false. It should be called when the 
     * calcultion is no longer needed.  */
    clearCalcPending() {
        this.calcPending = false;
    }

    //Must be implemented in extending object
    ///** This method udpates the dependencies if needed because
    // *a variable was added or removed from the model. Any member that has its dependencies udpated
    // * should be added to the additionalUpdatedObjects list. */
    //updateDependeciesForModelChange(model,additionalUpdatedMembers);

    /** This does any init needed for calculation.  */
    prepareForCalculate() {
        this.calcPending = true;

        //clear any errors, and other state info
        this.clearState();
    }

    ///** This updates the member based on a change in a dependency.  */
    //calculate(model);

    /** This method calculates the contribution to the state of the member based on it dependencies. */
    calculateDependentState(model,doSetState) {
        let errorImpactorList = [];
        let resultPending = false;
        let resultInvalid = false;

        let dependsOnMap = this.getField("dependsOnMap");
        for(var idString in dependsOnMap) {
            let impactor = model.lookupObjectById(idString);
            
            let impactorState = impactor.getState();
            if(impactorState == apogeeutil.STATE_ERROR) {
                errorImpactorList.push(impactor);
            } 
            else if(impactorState == apogeeutil.STATE_PENDING) {
                resultPending = true;
            }
            else if(impactorState == apogeeutil.STATE_INVALID) {
                resultInvalid = true;
            }
        }

        let state;
        let error;
        if(errorImpactorList.length > 0) {
            state = apogeeutil.STATE_ERROR;
            error = Member.createDependsOnError(model,errorImpactorList);
            if(doSetState) this.setError(model,error);
        }
        else if(resultPending) {
            state = apogeeutil.STATE_PENDING;
            if(doSetState) this.setResultPending(model);
        }
        else if(resultInvalid) {
            state = apogeeutil.STATE_INVALID;
            if(doSetState) this.setResultInvalid(model);
        }
        else {
            state = apogeeutil.STATE_NORMAL;
            //state not set in normal case - will be set when data is set
        }

        return {state, error};
    }

    /** This method makes sure any impactors are set. It sets a dependency 
     * error if one or more of the dependencies has a error. */
    initializeImpactors(model) {
        //make sure dependencies are up to date
        let dependsOnMap = this.getField("dependsOnMap");
        for(var idString in dependsOnMap) {
            let impactor = model.lookupObjectById(idString);
            if((impactor.isDependent)&&(impactor.getCalcPending())) {
                impactor.calculate(model);
            }
        }
    }

    /** This method removes this dependent from the model impacts map. */
    onDeleteMember(model) {
        super.onDeleteMember(model);

        //remove this dependent from the impactor
        let dependsOnMap = this.getField("dependsOnMap");
        for(var remoteMemberIdString in dependsOnMap) {
            //remove from imacts list
            model.removeFromImpactsList(this.getId(),remoteMemberIdString);
        }
    }
    //===================================
    // Private Functions
    //===================================

    /** This sets the dependencies based on the code for the member. */
    updateDependencies(model,newDependsOnMap) {
        let dependenciesUpdated = false;

        let oldDependsOnMap = this.getField("dependsOnMap");
        for(var idString in newDependsOnMap) {
            if(newDependsOnMap[idString] != oldDependsOnMap[idString]) {
                dependenciesUpdated = true;
                if(!oldDependsOnMap[idString]) model.addToImpactsList(this.getId(),idString);
            }
        }
        for(var idString in oldDependsOnMap) {
            if(newDependsOnMap[idString] != oldDependsOnMap[idString]) {
                dependenciesUpdated = true;
                if(!newDependsOnMap[idString]) model.removeFromImpactsList(this.getId(),idString);
            }
        }

        if(dependenciesUpdated) {
            this.setField("dependsOnMap",newDependsOnMap);
        }

        return dependenciesUpdated;
    }
}
