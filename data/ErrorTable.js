import apogeeutil from "/apogeeutil/apogeeUtilLib.js";
import Model from "/apogee/data/Model.js";
import Member from "/apogee/datacomponents/Member.js";

/** This class encapsulatees a table with no specific functionality. It
 * is intended to be used as a placeholder when a table generator is not found. */
export default class ErrorTable extends Member {

    constructor(name,parentId,instanceToCopy,keepUpdatedFixed,specialCaseIdValue) {
        super(name,parentId,instanceToCopy,keepUpdatedFixed,specialCaseIdValue);

        var dummyData = "";
        this.setData(model,dummyData);
    }

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

    /** This method creates a member from a json. It should be implemented as a static
     * method in a non-abstract class. */ 
    static fromJson(parentId,json) {
        //note - we send in the complete JSON so we can return is on saving
        let member = new ErrorTable(json.name,parentId,null,null,json.specialIdValue);

        //set the initial data
        member.setField("completeJson",json);

        return member;
    }

    //------------------------------
    // Dependent Methods
    //------------------------------

    /** This method udpates the dependencies if needed because
     *a variable was added or removed from the model.  */
    updateDependeciesForModelChange(model,additionalUpdatedMembers) {
        //no action
    }

    /** This is a check to see if the object should be checked for dependencies 
     * for recalculation. It is safe for this method to always return false and
     allow the calculation to happen.  */
   memberUsesRecalculation() {
        return false;
    }

}
//============================
// Static methods
//============================

ErrorTable.generator = {};
ErrorTable.generator.displayName = "Error Member";
ErrorTable.generator.type = "apogee.ErrorMember";
ErrorTable.generator.createMember = ErrorTable.fromJson;
ErrorTable.generator.setDataOk = false;

//register this member
Model.addMemberGenerator(ErrorTable.generator);