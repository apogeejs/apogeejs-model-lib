//some global definitions for the node environment
global.__globals__ = global;
__globals__.__APOGEE_ENVIRONMENT__ = "NODE";

//a global def we wil use in UI
// declare global: os, navigator
__globals__.__OS_IS_MAC__ = typeof navigator != "undefined" ? /Mac/.test(navigator.platform)
    : typeof os != "undefined" ? os.platform() == "darwin" : false;

//define the module load functions - loadModule is the same as require
__globals__.loadModule = require;


//==============================
// Globals Management
// (This same code is copied into web globals)
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
//    if(globalWhiteList[variableName]) {
        return __globals__[variableName];
//    }
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
//    if(whiteListedModuleNames[moduleName] !== undefined) {
        return __globals__.loadModule(moduleName,flags);
//    }
//    else {
//        return null;
//    }
}

//==============================
// Adding additional variables to model
//==============================

__globals__.addDataToModelGlobals(loadModule,__globals__.modelLoadModule,true);

//add the "require" function to the model, matching the model version of loadModule
__globals__.addDataToModelGlobals("require",__globals__.modelLoadModule,true);

//add some locally defined globals to the model whitelist
__globals__.addNameToModelGlobals("__APOGEE_ENVIRONMENT__",true);
__globals__.addNameToModelGlobals("__OS_IS_MAC__",true);



