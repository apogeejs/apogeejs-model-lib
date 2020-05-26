//This module exports the public interface to the Apogee Core Library
//(It also loads the needed empty imports)
export {default as Model} from "/apogee/data/Model.js";
export { doAction } from "/apogee/actions/action.js";
export { validateTableName } from "/apogee/lib/codeCompiler.js";
export {default as Messenger} from "/apogee/actions/Messenger.js";

//initialize the member and action types
import "/apogee/memberConfig.js";
import "/apogee/commandConfig.js";