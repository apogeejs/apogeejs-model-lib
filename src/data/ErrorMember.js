import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import Model from "/apogeejs-model-lib/src/data/Model.js";
import Member from "/apogeejs-model-lib/src/datacomponents/Member.js";

/** This class encapsulatees a member with no specific functionality. It
 * is intended to be used as a placeholder when a member type config is not found. */
export default class ErrorMember extends Member {

    //------------------------------
    // Member Methods
    //------------------------------

    /** This method extends set data from member. It also
     * freezes the object so it is immutable. (in the future we may
     * consider copying instead, or allowing a choice)*/
    setData(model,data) {
        
        //make this object immutable
        apogeeutil.deepFreeze(data);

        //store the new object
        return super.setData(model,data);
    }

    /** This overrides the commplete json to just pass back the entire json sent in. */
    toJson(model) {
        return this.getField("completeJson");
    }

    //------------------------------
    // Dependent Methods
    //------------------------------

    /** This method udpates the dependencies if needed because
     *a variable was added or removed from the model.  */
    updateDependeciesForModelChange(model,additionalUpdatedMembers) {
        //no action
    }

}

/** This function creates a new instance */ 
function createMember(model,json) {
    //note - we send in the complete JSON so we can return is on saving
    let member = new ErrorMember(json.name,null,TYPE_CONFIG,json.specialCaseIdValue);

    //this is a bit clumsy, but we don't want to save the "specialCaseIdValue",
    //so we delete it if it is present
    //in other tables, it is just not added when we save the object
    let cleanedJson = apogeeutil.jsonCopy(json);
    if(cleanedJson.specialCaseIdValue) delete cleanedJson.specialCaseIdValue;

    //set the initial data
    member.setData(model,"");
    member.setField("completeJson",cleanedJson);

    return member;
}

const TYPE_CONFIG = {
    type: "apogee.ErrorMember",
    createMember: createMember
}

//register this member
Model.registerTypeConfig(TYPE_CONFIG);