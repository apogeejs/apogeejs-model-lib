import {isNameReserved, analyzeCode} from "/apogeejs-model-lib/src/lib/codeAnalysis.js"; 

/** This test for a valid member name, including tests for excluded names.  
 * @private */
const NAME_PATTERN = /[a-zA-Z_$][0-9a-zA-Z_$]*/;

/** This function validates a member name. It returns 
 * [valid,errorMsg]. */
export function validateMemberName(name) {
    var nameResult = {};

    //check if it is a keyword
    let reservedResult = isNameReserved(name);
    if(reservedResult.reserved) {
        nameResult.errorMessage = "Illegal name: " + name + " - " + reservedResult.message;
        nameResult.valid = false;
    }  
    else {
        //check the pattern
        var nameResult = NAME_PATTERN.exec(name);
        if((!nameResult)||(nameResult[0] !== name)) {
            if(!nameResult) nameResult = {};
            nameResult.errorMessage = "Illegal name format: " + name;
            nameResult.valid = false;
        }
        else {
            nameResult.valid = true;
        }
    }
    return nameResult;
}

/** This method analyzes the code and creates the object function and dependencies. 
 * The results are loaded into the passed object processedCodeData. */
export function processCode(argList,functionBody,supplementalCode,memberName) {
    
    //analyze the code
    let memberFunctionName = memberName + "_mainFunction"
    var combinedFunctionBody = createCombinedFunctionBody(memberFunctionName,argList,functionBody,supplementalCode,memberName);
        
    //get the accessed variables
    //
    //parse the code and get variable dependencies
    var effectiveCombinedFunctionBody = _getEffectiveFunctionBodyHeader(memberFunctionName) + combinedFunctionBody;
    var analyzeOutput = analyzeCode(effectiveCombinedFunctionBody);
    
    var compiledInfo = {};
    
    if(analyzeOutput.success) {
        compiledInfo.varInfo = analyzeOutput.varInfo;
    }
    else {
        compiledInfo.errorMsg = analyzeOutput.errorMsg;
        if(analyzeOutput.errorInfo) compiledInfo.errorInfo = analyzeOutput.errorInfo;
        compiledInfo.valid = false;
        return compiledInfo;
    }

    //create and execute the generator function
    var {generatorBody,inputMapKeys} = createGeneratorBody(memberFunctionName,compiledInfo.varInfo, combinedFunctionBody);
    try {
        //execute the generator function to get the member function generator
        //and the memberScopeInitializer
        var generatorFunction = new Function(generatorBody);

        //get the output functions
        var generatedFunctions = generatorFunction();
        compiledInfo.memberFunctionGenerator = generatedFunctions.memberGenerator;
        compiledInfo.memberScopeInitializer = (model,scopeManager) => {
            let inputMap = _createInputMap(model,scopeManager,inputMapKeys);
            generatedFunctions.scopeInitializer(inputMap);
        } 
        compiledInfo.memberModelInitializer =  generatedFunctions.modelInitializer; 
        compiledInfo.valid = true; 
        compiledInfo.generatorFunction = generatorFunction;                
    }
    catch(ex) {
        //this is for parse errors not captured in esprmia
        compiledInfo.errorMsg = ex.message ? ex.message : ex ? ex.toString() : "Unknown";
        let errorInfo = {};
        errorInfo.type = "javascriptParseError";
        errorInfo.description = compiledInfo.errorMsg;
        if(ex.stack) errorInfo.stack =  ex.stack;
        errorInfo.code = generatorBody;
        compiledInfo.errorInfo = errorInfo;
        compiledInfo.valid = false;
    }
    
    return compiledInfo;   
}


/** This method creates the user code object function body. 
 * @private */
function createCombinedFunctionBody(memberFunctionName,
        argList,
        functionBody, 
        supplementalCode,
        memberName) {
    
    var argListString = argList.join(",");
    
    //create the code body
    var combinedFunctionBody = `//${memberName}

//user private code==============
${supplementalCode}
//end user private code==========

//member main function===========
function ${memberFunctionName}(${argListString}) {
    __memberFunctionDebugHook('${memberName}');

//user main code-----------------
${functionBody}
//end user main code-------------
}
//end member function============
`
        
    return combinedFunctionBody;
}

/** This method creates (1) a closure function that returns another generator function
 * which makes the member function and (2) a function that initializes any external 
 * variables needed in the member function.
 * This closure wraps the variables that are external to this member, meaning other
 * members in the model.
 * This initializer function allows the code to be compiled once and then used with different
 * values for other data in the model.
 * The generator that makes the member function is a closure to wrap the member private
 * code and any other needed data with the member function.
 * @private */
function createGeneratorBody(memberFunctionName,varInfo, combinedFunctionBody) {
    
    var scopeDeclarationText = "";
    var initializerBody = "";
    var inputMapKeys = [];
    
    //set the scope - here we only defined the variables that are actually used.
	for(var baseName in varInfo) {        
        var baseNameInfo = varInfo[baseName];
        
        //do not add scope variable for local or "returnValue", which is explicitly defined
        if((baseNameInfo.isLocal)||(baseNameInfo.scopeInjects)) continue;
        
        //add a declaration
        inputMapKeys.push(baseName);
        scopeDeclarationText += `\nvar ${baseName};`;
        
        //add to the scope setter
        initializerBody += `\n\t\t${baseName} = __inputMap.${baseName}`;
    }
    
    //create the generator for the object function
    var generatorBody = `'use strict'
//scope variables
var apogeeMessenger;
${scopeDeclarationText}

return {
    'memberGenerator': function()  {
${combinedFunctionBody}
return ${memberFunctionName}
    },
    'scopeInitializer': function(__inputMap) {${initializerBody}
    },
    'modelInitializer': function(__messenger) {
        apogeeMessenger = __messenger;
    }
};
`
    return {generatorBody,inputMapKeys};    
}

   
/** This line is added for analyzing the body to add any desired header information.
 * @private */
function _getEffectiveFunctionBodyHeader(memberFunctionName) {
    return `'use strict'
`
}

function _createInputMap(model,scopeManager,inputMapKeys) {
    let inputMap = {};
    let undefinedValues = [];
    inputMapKeys.forEach(variableName => {
        let value = scopeManager.getValue(model,variableName);
        inputMap[variableName] = value;
        if(value === undefined) {
            undefinedValues.push(variableName);
        }
    });
    if(undefinedValues.length > 0) {
        throw new Error("The following variables have not been defined or are not currently available in member code: " + undefinedValues.toString());
    }
    return inputMap;
}
   



