
import Model from "/apogeejs-model-lib/src/data/Model.js";
import JsonTable from "/apogeejs-model-lib/src/data/JsonTable.js";
import FunctionTable from "/apogeejs-model-lib/src/data/FunctionTable.js";

/** This function defines a JsonTable that is hard coded. It is automatically added to
 * the workspace under the name typeName. */
export function defineHardcodedJsonTable(typeName,functionBody,optionalPrivateCode) {

    class HardcodedJsonTable extends JsonTable {

        /** This overrides the get update data method so there is not saved data. */
        getFieldsJsonData() {
            return undefined;
        }
    }

    /** This function creates a new instance */ 
    let createMember = function(model,json) {
        let member = new HardcodedJsonTable(json.name,null,null,json.specialCaseIdValue);

        //set the initial data to the hardcoded code value
        let initialData = {
            argList: [],
            functionBody: functionBody,
            aupplementalCode: optionalPrivateCode ? optionalPrivateCode : ""
        }

        member.loadFieldsFromJson(model,initialData);

        return member;
    }

    HardcodedJsonTable.generator = {};
    HardcodedJsonTable.generator.type = typeName;
    HardcodedJsonTable.generator.createMember = createMember;
    HardcodedJsonTable.generator.setDataOk = true;
    HardcodedJsonTable.generator.setCodeOk = false;

    //register this member
    Model.addMemberGenerator(HardcodedJsonTable.generator);
}

/** This function defines a FunctionTable thatis hard coded. It is automatically added to
 * the workspace under the name typeName. */
export function defineHardcodedFunctionTable(typeName,argListArray,functionBody,optionalPrivateCode) {

    class HardcodedFunctionTable extends FunctionTable {

        /** This overrides the get update data method so there is not saved data. */
        getFieldsJsonData() {
            return undefined;
        }
    }

    /** This function creates a new instance */ 
    let createMember = function(model,json) {
        let member = new HardcodedJsonTable(json.name,null,null,json.specialCaseIdValue);

        //set the initial data to the hardcoded code value
        let initialData = {
            argList: argListArray,
            functionBody: functionBody,
            aupplementalCode: optionalPrivateCode ? optionalPrivateCode : ""
        }

        member.loadFieldsFromJson(model,initialData);

        return member;
    }

    HardcodedFunctionTable.generator = {};
    HardcodedFunctionTable.generator.type = typeName;
    HardcodedFunctionTable.generator.createMember = createMember;
    HardcodedFunctionTable.generator.setDataOk = false;
    HardcodedFunctionTable.generator.setCodeOk = false;

    //register this member
    Model.addMemberGenerator(HardcodedFunctionTable.generator);
}

export function getSerializedHardcodedTable(instanceName,typeName) {
    return {
        "name": instanceName,
        "type": typeName
    }
}

