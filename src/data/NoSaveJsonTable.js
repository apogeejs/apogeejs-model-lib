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

}

//============================
// Static methods
//============================

NoSaveJsonTable.generator = {};
Object.assign(NoSaveJsonTable.generator,JsonTable.generator);
NoSaveJsonTable.generator.type = "apogee.NoSaveJsonMember";


//register this member
Model.addMemberGenerator(NoSaveJsonTable.generator);