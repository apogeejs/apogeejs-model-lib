//This module exports the public interface to the Apogee Core Library
//(It also loads the needed empty imports)
export {default as Model} from "/apogeejs-model-lib/src/data/Model.js";
export {doAction} from "/apogeejs-model-lib/src/actions/action.js";
export {default as BaseRunContext} from "/apogeejs-model-lib/src/actions/BaseRunContext.js";
export {validateMemberName} from "/apogeejs-model-lib/src/lib/codeCompiler.js";
export {default as Messenger} from "/apogeejs-model-lib/src/actions/Messenger.js";
export {defineHardcodedDataMember, defineHardcodedFunctionMember, getSerializedHardcodedMember,
            defineHardcodedJsonTable, defineHardcodedFunctionTable, getSerializedHardcodedTable} from "/apogeejs-model-lib/src/data/hardcodedmembers.js";

//initialize the member and action types
import "/apogeejs-model-lib/src/memberConfig.js";
import "/apogeejs-model-lib/src/commandConfig.js";