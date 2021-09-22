
/** This is a messenger class for sending action messages. 
 * If the send fails, and exception will be thrown. */
export default class Messenger {
    
    /** 
     * model - the model from which this is called.
     * fromOjbect - the reference member from which this is called or, if no reference, the model object. */
    constructor(runContext,fromObjectId) {
        this.runContext = runContext;
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
        var member = this._getMemberObject(updateMemberName);
        if(!member) {
            throw new Error("Error calling messenger - member not fond: " + updateMemberName);
        }
        
        //set the data for the member, along with triggering updates on dependent members.
        var actionData = {};
        actionData.action = "updateData";
        actionData.memberId = member.getId();
        actionData.data = data;

        this.runContext.executeAction(actionData);
    }

    /** This is similar to dataUpdate except is allows multiple values to be set.
     * The argument update info is an array with each element representing an individual
     * data update. Each element shoudl be a 2-element array with the first entry being
     * the member name and the second being the data value. */
    compoundDataUpdate(updateInfo) { 
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

        this.runContext.executeAction(actionData);
    }
    
    //=====================
    // Private Functions
    //=====================
    
    /** This method returns the member instance for a given local member name,
     * as defined from the source object context. */
    _getMemberObject(localMemberName) { 
        let currentModel = this.runContext.getCurrentModel();
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
    


