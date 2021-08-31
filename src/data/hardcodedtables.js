
import Model from "/apogeejs-model-lib/src/data/Model.js";
import JsonTable from "/apogeejs-model-lib/src/data/JsonTable.js";
import FunctionTable from "/apogeejs-model-lib/src/data/FunctionTable.js";

/** This function defines a JsonTable that is hard coded. It is automatically added to
 * the workspace under the name typeName. */
export function defineHardcodedJsonTable(typeName,functionBody,optionalPrivateCode) {

    let createMember = function(model,json) {
        let member = new JsonTable(json.name,null,hardcodedDataTypeConfig,json.specialCaseIdValue);
        member.loadFieldsForCreate(model,json.fields);
        return member;
    }

    //Hardcoded - Fields are locked and not saved, default fields set.
    const hardcodedDataTypeConfig = {
        type: typeName,
        createMember: createMember,
        defaultFields: {
            argList: [],
            functionBody: functionBody,
            aupplementalCode: optionalPrivateCode ? optionalPrivateCode : ""
        },
        fieldsLockedChangeable: false,
        defaultFieldsLocked: true,
        noSaveChangeable: false,
        defaultNoSave: true
    }
    
    Model.registerTypeConfig(hardcodedDataTypeConfig);
}

/** This function defines a FunctionTable thatis hard coded. It is automatically added to
 * the workspace under the name typeName. */
export function defineHardcodedFunctionTable(typeName,argListArray,functionBody,optionalPrivateCode) {

    let createMember = function(model,json) {
        let member = new FunctionTable(json.name,null,hardcodedFunctionTypeConfig,json.specialCaseIdValue);
        member.loadFieldsForCreate(model,json.fields);
        return member;
    }

    const hardcodedFunctionTypeConfig = {
        type: typeName,
        createMember: createMember,
        defaultFields: {
            argList: argListArray,
            functionBody: functionBody,
            aupplementalCode: optionalPrivateCode ? optionalPrivateCode : ""
        },
        fieldsLockedChangeable: false,
        defaultFieldsLocked: true,
        noSaveChangeable: false,
        defaultNoSave: true
    }
    
    Model.registerTypeConfig(hardcodedFunctionTypeConfig);
}

export function getSerializedHardcodedTable(instanceName,typeName) {
    return {
        "name": instanceName,
        "type": typeName
    }
}

