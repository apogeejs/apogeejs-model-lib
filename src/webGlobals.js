//some global definitions for the web browser environment
window.__globals__ = window;
__globals__.__APOGEE_ENVIRONMENT__ = "WEB";

//a global def we wil use in UI
// declare global: os, navigator
__globals__.__OS_IS_MAC__ = typeof navigator != "undefined" ? /Mac/.test(navigator.platform)
    : typeof os != "undefined" ? os.platform() == "darwin" : false;

//==============================
// Define Module Load Functions
//==============================

let moduleMap = {};

/** This returns the module for a given name. If the default export is present it is returned
 * unless optionalNamedFlag is true, in which case the named module data is return. If the default export
 * is not present, the named module export is returned with or without the optionalNamedFlag being set to true.
 * If the module is not defined, if it is pending or if it failed to load, as error is thrown. */
__globals__.loadModule = function(moduleName,optionalNamedFlag) {
    let moduleWrapper = moduleMap[moduleName];

    if(!moduleWrapper) {
        //module not defined
        throw new Error("Module not defined: " + moduleName);
    }
    else if(!moduleWrapper.moduleData) {
        if(moduleWrapper.pendingPromise) {
            throw new Error(`Module ${moduleName} is pending!`);
        }
        else {
            throw new Error(`Module ${moduleName} not loaded: ${moduleWrapper.msg}`);
        }
    }

    if(optionalNamedFlag) {
        return moduleWrapper.moduleData;
    }
    else if(moduleWrapper.moduleData.default) {
        return moduleWrapper.moduleData.default;
    }
    else {
        return moduleWrapper.moduleData;
    }
}

/** This method imports the module of the given name from the given url. It returns a promise for the loaded promise and
 * also loads the module so it is returned from the method loadModule. If the flag isPermanent is set the module can not be
 * updated or deleted. */
__globals__.importModule = function(moduleName,url,isPermanent) {
    if(moduleMap[moduleName] !== undefined) return Promise.reject("There is already a loaded module with this name: " + moduleName);

    return _importModuleImplementation(moduleName,url,isPermanent);
};

/** This method updates the url for the module of the given name. This can only be done if the module was defined
 * with isPremanent == falsey. The return value is a promise for the modules. The module will also be available
 * from loadModule, but only after the promise resolves. */
__globals__.updateModule = function(moduleName,url)  {
    let moduleEntry = moduleMap[moduleName];
    if(moduleEntry === undefined) return Promise.reject("There is no current modules with the name: " + moduleName);
    if(moduleEntry.isPermanent) return Promise.reject("The given promise can not be updated: " + moduleName);
    
    return _importModuleImplementation(moduleName,url,false);
}

/** This method remove the given module from loadModule. This can only be called if the module was defined with
 * isPermanent = falsey. The function throws an error is the module does not exist. If the module can not be deleted
 * the function returns with no action. */
__globals__.removeModule = function(moduleName) {
    let moduleEntry = moduleMap[moduleName];
    if(moduleEntry === undefined) return;
    if(moduleEntry.isPermanent) throw new Error("The given promise can not be updated: " + moduleName);

    delete moduleMap[moduleName];
}

/** This dynamically loads the es module, returning a promise for the module data. */
function _importModuleImplementation(moduleName,url,isPermanent) {
    let moduleEntry = {
        name: moduleName,
        url: url,
        isPermanent: isPermanent,
        moduleData: null
    }

    moduleMap[moduleName] = moduleEntry;
    
    let importPromise = import(url);
    moduleEntry.pendingPromise = importPromise;

    //handle promise resolve/reject
    importPromise.then(module => {
        if(moduleEntry.pendingPromise == importPromise) {
            moduleEntry.moduleData = module;
            delete moduleEntry.pendingPromise;
        }
    }).catch(error => {
        if(moduleEntry.pendingPromise == importPromise) {
            moduleEntry.msg = error.toString();
            delete moduleEntry.pendingPromise;
        }
    })

    return importPromise;
}



//==============================
// Globals Management
// (This same code is copied into node globals)
//==============================

/** This module defines some globals values related to management of javascript modules
 * and global values. */

//These are the exports from apogee modules (not the modules themselves)
let apogeeModuleExports = {};
//These are javascript globals that should be passed to the model globals
let globalWhiteList = {};
//These are globals to be added to the model that are not a part of the normal javascript globals
let platformGlobals = {};
//These are modules (non-apogee) to be passed through to the model
let whiteListedModuleNames = {};

//apogee module data

__globals__.apogeeModuleExport = function(moduleName) {
    let currentEntry = apogeeModuleExports[moduleName];
    if(currentEntry) return currentEntry.data;
    else return null;
}

__globals__.addApogeeModuleExport = function(moduleName,data,isPermanent) {
    let currentEntry = apogeeModuleExports[moduleName];
    if(currentEntry) throw new Error("There is alread an export with the given name: " + moduleName);
    currentEntry = {
        data: data,
        isPermanent: isPermanent
    }
    apogeeModuleExports[moduleName] = currentEntry;
}

__globals__.removeApogeeModuleExport = function(moduleName) {
    let currentEntry = apogeeModuleExports[moduleName];
    if(!currentEntry) return;
    if(currentEntry.isPermanent) throw new Error("The export can not be removed: " + moduleName);
    delete apogeeModuleExports[moduleName];
}

//globals 

__globals__.getModelGlobal = function(variableName) {
    if(platformGlobals[variableName] !== undefined) {
        return platformGlobals[variableName].data;
    }
    if(globalWhiteList[variableName]) {
        return __globals__[variableName];
    }
}

//Model globals white list

__globals__.addNameToModelGlobals = function(variableName,isPermanent) {
    let currentEntry = globalWhiteList[variableName];
    if(currentEntry) {
        if((isPermanent)&&(!currentEntry.isPermanent)) currentEntry.isPermanent;
    }
    else {
        currentEntry = {isPermanent: isPermanent}
        globalWhiteList[variableName] = currentEntry;
    }
}

__globals__.removeNameFromModelGlobals = function(variableName) {
    let currentEntry = globalWhiteList[variableName];
    if(currentEntry) {
        if(currentEntry.isPermanent) throw new Error("The name can not be removed!");
        else delete globalWhiteList[variableName];
    }
}

//Model added global values

__globals__.addDataToModelGlobals = function(variableName,data,isPermanent) {
    let currentEntry = platformGlobals[variableName];
    if(currentEntry) throw new Error("There is alread a value with the given name: " + variableName);
    currentEntry = {
        data: data,
        isPermanent: isPermanent
    }
    platformGlobals[variableName] = currentEntry;
}

__globals__.removeDataFromModelGlobals = function(variableName) {
    let currentEntry = platformGlobals[variableName];
    if(!currentEntry) return;
    if(currentEntry.isPermanent) throw new Error("The value can not be removed: " + variableName);
    delete platformGlobals[variableName];
}

//Whitelist modules for model

__globals__.addNameToModelModules = function(moduleName,isPermanent) {
    let currentEntry = whiteListedModuleNames[moduleName];
    if(currentEntry) {
        if((isPermanent)&&(!currentEntry.isPermanent)) currentEntry.isPermanent;
    }
    else {
        currentEntry = {isPermanent: isPermanent}
        whiteListedModuleNames[moduleName] = currentEntry;
    }
}

__globals__.removeNameFromModelModules = function(moduleName) {
    let currentEntry = whiteListedModuleNames[moduleName];
    if(currentEntry) {
        if(currentEntry.isPermanent) throw new Error("The module name can not be removed from the model list: " + moduleName);
        else delete whiteListedModuleNames[moduleName];
    }
}

//This is the loadModule function to be used in the model, passing only white listed modules
__globals__.modelLoadModule = function(moduleName,flags) {
    if(whiteListedModuleNames[moduleName] !== undefined) {
        return __globals__.loadModule(moduleName,flags);
    }
    else {
        return null;
    }
}


//==============================
// Adding additional variables to model
//==============================

__globals__.addDataToModelGlobals("loadModule",__globals__.modelLoadModule,true);

//add some locally defined globals to the model whitelist
__globals__.addNameToModelGlobals("__APOGEE_ENVIRONMENT__",true);
__globals__.addNameToModelGlobals("__OS_IS_MAC__",true);
__globals__.addNameToModelGlobals("apogeeModuleExport",true);


