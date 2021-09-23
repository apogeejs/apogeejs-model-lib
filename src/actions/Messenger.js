
/** This is a messenger class for sending action messages. 
 * If the send fails, and exception will be thrown. */
export default class Messenger {
    
    /** 
     * runContextLink - reference to the run context for the model sequence this massenger will call against.
     * fromOjbectId - the reference member from which this is called or, if no reference, the model object. If this argument
     *     is omitted the model is assumed. */
    constructor(runContextLink,fromObjectId) {
        this.runContextLink = runContextLink;
        if(!fromObjectId) {
            let model = this.runContextLink.getCurrentModel();
            if(model) {
                //(model will only be invalid, potentially, after we terminate the run context)
                fromObjectId = model.getId();
            }
        }
        this.fromObjectId = fromObjectId;
    }

    /** This is a convenience method to set a member to a given value.
     * updateMemberName - This is a member name as it would be accessed from the local code
     * data - This is the data to set on the given member. Aside from a JSON value, additional 
     * options are a Promise, to do an asynchronous update, a Error, to send an error to 
     * that member, or apogeeutil.INVALID_VALUE to send the invalid value.
     * These updates are applied after the current calculation is completed. See documentation
     * for more information on the messenger. */
    dataUpdate(updateMemberName,data) {
        if(!this.runContextLink.getIsActive()) return;

        var member = this._getMemberObject(updateMemberName);
        if(!member) {
            throw new Error("Error calling messenger - member not fond: " + updateMemberName);
        }
        
        //set the data for the member, along with triggering updates on dependent members.
        var actionData = {};
        actionData.action = "updateData";
        actionData.memberId = member.getId();
        actionData.data = data;

        this.runContextLink.executeAction(actionData);
    }

    /** This is similar to dataUpdate except is allows multiple values to be set.
     * The argument update info is an array with each element representing an individual
     * data update. Each element shoudl be a 2-element array with the first entry being
     * the member name and the second being the data value. */
    compoundDataUpdate(updateInfo) { 
        if(!this.runContextLink.getIsActive()) return;

        //make the action list
        var actionList = [];
        for(var i = 0; i < updateInfo.length; i++) {
            let updateEntry = updateInfo[i];
            let subActionData = {};
            
            let member = this._getMemberObject(updateEntry[0]);
            if(!member) {
                throw new Error("Error calling messenger - member not fond: " + updateEntry[0]);
            }
            let data = updateEntry[1];
            
            subActionData.action = "updateData";
            subActionData.memberId = member.getId();
            subActionData.data = data;
            if(data instanceof Promise) {
                //for now no callback on promise
            }
            actionList.push(subActionData);
        }
        
        //create the single compound action
        var actionData = {};
        actionData.action = "compoundAction";
        actionData.actions = actionList;

        this.runContextLink.executeAction(actionData);
    }
    
    //=====================
    // Private Functions
    //=====================
    
    /** This method returns the member instance for a given local member name,
     * as defined from the source object context. */
    _getMemberObject(localMemberName) { 
        let currentModel = this.runContextLink.getCurrentModel();
        let fromObject = currentModel.lookupObjectById(this.fromObjectId);
        if(!fromObject) {
            throw new Error("Error calling messenger - source member not found!")
        }
        let scopeManager = fromObject.getScopeManager();

        var pathArray = localMemberName.split(".");
        var member = scopeManager.getMember(currentModel,pathArray);
        return member;
    }
}
    


