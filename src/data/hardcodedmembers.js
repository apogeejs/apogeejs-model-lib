
import Model from "/apogeejs-model-lib/src/data/Model.js";
import DataMember from "/apogeejs-model-lib/src/data/DataMember.js";
import FunctionMember from "/apogeejs-model-lib/src/data/FunctionMember.js";

/** This function defines a DataMember that is hard coded. It is automatically added to
 * the workspace under the name typeName. */
export function defineHardcodedDataMember(typeName,functionBody,optionalPrivateCode) {

    let createMember = function(model,json) {
        let member = new DataMember(json.name,null,hardcodedDataTypeConfig,json.specialCaseIdValue);
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

/** This function defines a FunctionMember thatis hard coded. It is automatically added to
 * the workspace under the name typeName. */
export function defineHardcodedFunctionMember(typeName,argListArray,functionBody,optionalPrivateCode) {

    let createMember = function(model,json) {
        let member = new FunctionMember(json.name,null,hardcodedFunctionTypeConfig,json.specialCaseIdValue);
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

export function getSerializedHardcodedMember(instanceName,typeName) {
    return {
        "name": instanceName,
        "type": typeName
    }
}


/** legacy name 
 * @deprecated */
export function defineHardcodedJsonTable(typeName,functionBody,optionalPrivateCode) {
    return defineHardcodedDataMember(typeName,functionBody,optionalPrivateCode);
}

/** legacy name 
 * @deprecated */
export function defineHardcodedFunctionTable(typeName,argListArray,functionBody,optionalPrivateCode) {
    return defineHardcodedFunctionMember(typeName,argListArray,functionBody,optionalPrivateCode);
}

/** legacy name 
 * @deprecated */
export function getSerializedHardcodedTable(instanceName,typeName) {
    return getSerializedHardcodedMember(instanceName,typeName);
}

