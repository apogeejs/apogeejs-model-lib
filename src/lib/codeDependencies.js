import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";

/** This method takes the varInfo member from the code analysis and returns
 * a lit of member objects which this member depends on.
 */
export function getDependencyInfo(varInfo,model,scopeManager) {
	var dependsOnMap = {};
	
	//cycle through the variables used
	for(var baseName in varInfo) {
			
        //for each use of this name that is not local, find the referenced object
        var nameEntry = varInfo[baseName];
        if(nameEntry.scopeInjects) continue; //ignore variables injected into code (like apogeeMessenger)

        for(var i = 0; i < nameEntry.uses.length; i++) {
            var nameUse = nameEntry.uses[i];
            if(!nameUse.isLocal) {
                let impactorId

                //look up the object
                let namePath = nameUse.path;

                //lookup this object
                let member = scopeManager.getMember(model,namePath);
                if(member) impactorId = member.getId();

                //add the impactor to the dependency map
                if(impactorId) {
                    //add as dependent
                    if(dependsOnMap[impactorId] != true) {
                        dependsOnMap[impactorId] = true;
                    }
                }
            }
		}
	}
	
	return dependsOnMap;
}
