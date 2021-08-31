import Model from "/apogeejs-model-lib/src/data/Model.js";
import JsonTable from "/apogeejs-model-lib/src/data/JsonTable.js";

/** This is an extension of the JsonTable which does not save the data. */
export default class NoSaveJsonTable extends JsonTable {

    //------------------------------
    // Codeable Methods
    //------------------------------

    /** This overrides the get update data method so there is not saved data. */
    getFieldsJsonData() {
        return undefined;
    }
}

const DEFAULT_DEFAULT_VALUE = apogeeutil.INVALID_DATA;

/** This function creates a new instance */ 
function createMember(model,json) {
    let member = new NoSaveJsonTable(json.name,null,TYPE_CONFIG,json.specialCaseIdValue);

    //get a copy of the initial data and set defaults if needed
    //NEED TO LOAD DEFAULT VALUE FROM JSON!!!

    return member;
}

const TYPE_CONFIG = {
    type: "apogee.NoSaveJsonMember",
    createMember: createMember
}

//register this member
Model.registerTypeConfig(TYPE_CONFIG);