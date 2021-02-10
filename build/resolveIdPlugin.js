const path = require('path');

/** 
 * This plugin resolves imported files in the procesed source code.
 * The following are the assumed options for the import paths in the code:
 * 1) relative file reference
 * 2) internal absolute reference - format: "/(folder alias for local repo)/..."
 * 3) external file reference - format: any
 * Relative references will use the default handling. 
 * Internal absolute references will be remapped to the proper system folder.
 * External file references will be kept external, and remapped as specified. We allow for a different
 * external name for es modules and npm modules, since a different "import" format is used for these two formalisms. 
*/
function createResolveIdPlugin(
    currentSystemDirectory, //maybe "C:/aaa/bbb/ccc/apogee-repos/apogee-model-lib/build"
    pathFromCurrentSystemDirToDesiredAbsoluteRoot, //maybe "../.."
    repoName, //repo name, maybe "apogee-model-lib"
    localPathAlias, // alias - maybe "apogeemodel"
    externalNpmModuleMap //codePathPrefix:outputPathPrefix for external libs
) {
    //get the base directory for any absolute reference
    let ABS_IMPORT_BASE_DIR;
    if(pathFromCurrentSystemDirToDesiredAbsoluteRoot) {
        ABS_IMPORT_BASE_DIR = path.join(currentSystemDirectory,pathFromCurrentSystemDirToDesiredAbsoluteRoot);
    }
    else {
        ABS_IMPORT_BASE_DIR = currentSystemDirectory;
    }

    //get the paths to remap the local files that used absolute reference
    let importedPathFromAbsoluteBase = "/" + localPathAlias + "/";
    let actualPathFromAbsoluteBase = repoName + "/src/";
    
    //This is the actual plugin function
    let resolveId = (importedFile, importingFile, forEsModule) => {

        console.log("importedFile: " + importedFile + "; importingFile: " + importingFile);

        //this is to handle the initial file for the cjs case
        if(!importingFile) return null;

        //check if this is an external file
        let externalNpmName = externalNpmModuleMap[importedFile];
        if(externalNpmName) {
            //we might  not use npm name, but this shows it was an external lib
            if(forEsModule) {

                //use the same name for external import in es modules
                // console.log("result File: " + importedFile);
                // return {
                //     id: importedFile,
                //     external: true
                // }

                //TEST
                let index = importedFile.lastIndexOf("/");
                let libFileName = importedFile.substr(index+1);
                console.log("result File: " + libFileName);
                return {
                    id: libFileName,
                    external: true
                }
            }
            else {
                //use the remapped name for external npm modules
                console.log("result File: " + externalNpmName);
                return {
                    id: externalNpmName,
                    external: true
                }
            }
        }

        //check if this is an absolute reference of a local file
        //otherwise don't handle this import file - defer
        if(importedFile.startsWith(importedPathFromAbsoluteBase)) {
            let importedFileFromBase = actualPathFromAbsoluteBase + importedFile.substr(importedPathFromAbsoluteBase.length); 
            let filePath = path.resolve(ABS_IMPORT_BASE_DIR, importedFileFromBase);
            console.log("result File: " + filePath);
            return filePath;
        }
        else {
            //allow for alternate resolve id, including default handling
            return null;
        }
    }

    return {
        esResolveId: (importedFile, importingFile) => resolveId(importedFile, importingFile, true),
        npmResolveId: (importedFile, importingFile) => resolveId(importedFile, importingFile, false),
    };
}

module.exports = createResolveIdPlugin;
