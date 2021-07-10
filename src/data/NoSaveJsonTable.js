import Model from "/apogeejs-model-lib/src/data/Model.js";
import JsonTable from "/apogeejs-model-lib/src/data/JsonTable.js";

/** This is an extension of the JsonTable which does not save the data. */
export default class NoSaveJsonTable extends JsonTable {

    constructor(name,instanceToCopy,keepUpdatedFixed,specialCaseIdValue) {
        super(name,instanceToCopy,keepUpdatedFixed,specialCaseIdValue);
    }

    //------------------------------
    // Codeable Methods
    //------------------------------

    /** This overrides the get update data method so there is not saved data. */
    getUpdateData() {
        return undefined;
    }

    /** This method creates a member from a json. It should be implemented as a static
     * method in a non-abstract class. */ 
     static fromJson(model,json) {
        let member = new NoSaveJsonTable(json.name,null,null,json.specialIdValue);

        //get a copy of the initial data and set defaults if needed
        //NEED TO LOAD DEFAULT VALUE FROM JSON!!!

        return member;
    }

}

const DEFAULT_DEFAULT_VALUE = apogeeutil.INVALID_DATA;

//============================
// Static methods
//============================

NoSaveJsonTable.generator = {};
Object.assign(NoSaveJsonTable.generator,JsonTable.generator);
NoSaveJsonTable.generator.type = "apogee.NoSaveJsonMember";
NoSaveJsonTable.generator.createMember = NoSaveJsonTable.fromJson;
NoSaveJsonTable.generator.setDataOk = true;
NoSaveJsonTable.generator.setCodeOk = false;



//register this member
Model.addMemberGenerator(NoSaveJsonTable.generator);