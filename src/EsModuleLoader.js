/** This is a class to import ES modules and make them loadable through a function loadModule. */
export default class EsModuleLoader {

    constructor() {
        this.moduleMap = {};
    }

    /** This returns the module for a given name. If the default export is present it is returned
     * unless optionalNamedFlag is true, in which case the named module data is return. If the default export
     * is not present, the named module export is returned with or without the optionalNamedFlag being set to true.
     * If the module is not defined, if it is pending or if it failed to load, as error is thrown. */
    loadModule(moduleName,optionalNamedFlag) {
        let moduleWrapper = this.moduleMap[moduleName];

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
    importModule(moduleName,url,isPermanent) {
		if(this.moduleMap[moduleName] !== undefined) return Promise.reject("There is already a loaded module with this name: " + moduleName);

        return this._importModuleImplementation(moduleName,url,isPermanent);
	};

    /** This method updates the url for the module of the given name. This can only be done if the module was defined
     * with isPremanent == falsey. The return value is a promise for the modules. The module will also be available
     * from loadModule, but only after the promise resolves. */
    updateModule(moduleName,url)  {
        let moduleEntry = this.moduleMap[moduleName];
		if(moduleEntry === undefined) return Promise.reject("There is no current modules with the name: " + moduleName);
        if(moduleEntry.isPermanent) return Promise.reject("The given promise can not be updated: " + moduleName);
		
		return this._importModuleImplementation(moduleName,url,false);
	}

    /** This method remove the given module from loadModule. This can only be called if the module was defined with
     * isPermanent = falsey. The function throws an error is the module does not exist. If the module can not be deleted
     * the function returns with no action. */
    removeModule(moduleName) {
        let moduleEntry = this.moduleMap[moduleName];
		if(moduleEntry === undefined) return;
        if(moduleEntry.isPermanent) throw new Error("The given promise can not be updated: " + moduleName);

        delete this.moduleMap[moduleName];
    }

    //===========================
    // Private Methods
    //===========================

    /** This dynamically loads the es module, returning a promise for the module data. */
    _importModuleImplementation(moduleName,url,isPermanent) {
        let moduleEntry = {
            name: moduleName,
            url: url,
            isPermanent: isPermanent,
            moduleData: null
        }

        this.moduleMap[moduleName] = moduleEntry;
		
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

}


