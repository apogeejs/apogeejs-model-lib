import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";

/** This method takes the varInfo member from the code analysis and returns
 * a lit of member objects which this member depends on.
 */
export function getDependencyInfo(varInfo,model,contextManager) {
	var dependsOnMap = {};
	
	//cycle through the variables used
	for(var baseName in varInfo) {
			
        //for each use of this name that is not local, find the referenced object
        var nameEntry = varInfo[baseName];
        for(var i = 0; i < nameEntry.uses.length; i++) {
            var nameUse = nameEntry.uses[i];
            if(!nameUse.isLocal) {
                //look up the object
                var namePath = nameUse.path;

                //lookup this object
                var impactor = contextManager.getMember(model,namePath);

                //add the impactor to the dependency map
                if(impactor) {
                    //add as dependent
                    var memberId = impactor.getId();
                    if(dependsOnMap[memberId] != true) {
                        dependsOnMap[memberId] = true;
                    }
                }
            }
		}
	}
	
	return dependsOnMap;
}
