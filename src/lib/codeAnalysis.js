import esprima from "/apogeejs-releases/releases/ext/esprima/v4.0.1/esprima.es.js";

/** This function parses the code and returns a member that gives the variable use
 * in the passed function. The var info member has the following content
 * - it is a map with an entry for each variable accessed. (This refers just to
 * a variable and not to field access on that variable.
 * - the key for an entry is the name of the variable
 * - for each entry there is an array of usages. Each usage as the following info:
 * -- nameUse.path: an array of names constructing the field accessed.
   -- nameUse.scope: a reference to a scope object
   -- nameUse.node: the AST node that identifies this variable
   -- nameUse.isLocal: true if this is a reference to a local variable
   -- nameUse.decalredScope: for local variables only, gives the scope in which the lcoal variable is declared.
 * - additionally, there is a flag indicating if all uses of a name are local variables
 * -- isLocal: true if all uses of a varaible entry are local variables
 **/ 

/** Syntax for AST, names from Esprima.
 * Each entry is a list of nodes inside a node of a given type. the list
 * contains entries with the given fields:
 * {
 *     name:[the name of the field in the node]
 *     list:[true if the field is a list of nodes]
 *     declaration:[boolean indicating if the field corrsponds to a field declaration]
 * @private */
const syntax = {
    AssignmentExpression: [{name:'left'},{name:'right'}],
    AssignmentPattern: [{name:'left'},{name:'right'}],
    ArrayExpression: [{name:'elements',list:true}],
    ArrayPattern: [{name:'elements',list:true}],
    ArrowFunctionExpression: [
        {name:'params',list:true,declaration:true},
        {name:'body'},
    ],
    BlockStatement: [{name:'body',list:true}],
    BinaryExpression: [
        {name:'left'},
        {name:'right'}
    ],         
    BreakStatement: [],
    CallExpression: [{name:'callee'},{name:'arguments',list:true}],
    CatchClause: [
        {name:'param',declaration:true},
        {name:'body'}
    ],
    ConditionalExpression: [{name:'test'},{name:'alternate'},{name:'consequent'}],
    ContinueStatement: [],
    DebuggerStatement: [],
    DoWhileStatement: [{name:'body'},{name:'test',list:true}],
    EmptyStatement: [],
    ExpressionStatement: [{name:'expression'}],
    ForStatement: [{name:'init'},{name:'test'},{name:'update',list:true},{name:'body'}],
    ForOfStatement: [{name:'left'},{name:'right'},{name:'body'}],
    ForInStatement: [{name:'left'},{name:'right'},{name:'body'}],
    FunctionDeclaration: [
        {name:'id',declaration:true},
        {name:'params',list:true,declaration:true},
        {name:'body'}
    ],
    FunctionExpression: [
        {name:'id',declaration:true},
        {name:'params',list:true,declaration:true},
        {name:'body'}
    ],
    Identifier: [], //this is handled specially
    IfStatement: [{name:'test'},{name:'consequent'},{name:'alternate'}],
    Literal: [],
    LabeledStatement: [{name:'body'}],
    LogicalExpression: [{name:'left'},{name:'right'}],
    MemberExpression: [], //this handled specially
    NewExpression: [{name:'callee'},{name:'arguments',list:true}],
    Program: [{name:'body',list:true}],
    Property: [/*{name:'key'},*/{name:'value'}], //ignore the key, this will not be a variable - but espira does call it an identifier if it is written without quotes
    ReturnStatement: [{name:'argument'}],
    RestElement: [{name:'argument'}],
    SequenceExpression: [{name:'expressions',list:true}],
    ObjectExpression: [{name:'properties',list:true}], //this is handled specially 
    ObjectPattern: [{name:'properties',list:true}], 
    SpreadElement: [{name:'argument'}],
    SwitchCase: [{name:'test'},{name:'consequent',list:true}],
    SwitchStatement: [{name:'discriminant'},{name:'cases',list:true}],
    TemplateElement: [],
    TemplateLiteral: [{name:'quasis',list:true},{name:'expressions',list:true}],
    TaggedTemplateExpression: [{name:'tag'},{name:'quasi'}],
    ThisExpression: [],
    ThrowStatement: [{name:'argument'}],
    TryStatement: [
        {name:'block'},
        {name:'handler'},
        {name:'finalizer',list:true}
    ],
    UnaryExpression: [
        {name:'argument'}
    ],
    UpdateExpression: [{identifierNode:'argument'}],
    VariableDeclaration: [{name:'declarations',list:true,declaration:true}],
    VariableDeclarator: [{name:'id',declaration:true},{name:'init'}],
    WhileStatement: [{name:'body'},{name:'test',list:true}],
    WithStatement: [{name:'object'},{name:'body'}],

    //no support
    AwaitExpression: null, //oops - Using this is OK because it still actually works synchronously, but I'm leaving it out since it might be confusing. 
    ClassBody: null, //class related
    ClassDeclaration: null, //class related
    ClassExpression: null, //class related
    ExportAllDeclaration: null, //module related
    ExportDefaultDeclaration: null, //module related
    ExportNamedDeclaration: null, //module related
    ExportSpecifier: null, //module related
    ImportDeclaration: null, //module related
    ImportDefaultSpecifier: null, //module related
    ImportNamespaceSpecifier: null, //module related
    ImportSpecifier: null, //module related
    MetaProperty: null, //class related
    MethodDefinition: null, //class related
    Super: null, //class related
    YieldExpression: []//null //asynch we want to avoid

    //if we allowed module import, it would look like this I think
    //but we can not do this in a function, only a module
    //as of the time of this writing, esprima did not support parsing dynamic es6 imports
    // ImportDeclaration: [{name:'specifiers',list:true},{name:'source'}],
    // ImportDefaultSpecifier: [{name:'local'}],
    // ImportNamespaceSpecifier: [{name:'local'}],
    // ImportSpecifier: [{name:'local'},{name:'imported'}],
    
};

/** These are javascript keywords */
const KEYWORDS = {
	"abstract": true,
	"arguments": true,
    "async": true,
    "await": true,
	"boolean": true,
	"break": true,
	"byte": true,
	"case": true,
	"catch": true,
	"char": true,
	"class": true,
	"const": true,
	"continue": true,
	"debugger": true,
	"default": true,
	"delete": true,
	"do": true,
	"double": true,
	"else": true,
	"enum": true,
	"eval": true,
	"export": true,
	"extends": true,
	"false": true,
	"final": true,
	"finally": true,
	"float": true,
	"for": true,
	"function": true,
	"goto": true,
	"if": true,
	"implements": true,
	"import": true,
	"in": true,
	"instanceof": true,
	"int": true,
	"interface": true,
	"let": true,
	"long": true,
	"native": true,
	"new": true,
	"null": true,
	"package": true,
	"private": true,
	"protected": true,
	"public": true,
	"return": true,
	"short": true,
	"static": true,
	"super": true,
	"switch": true,
	"synchronized": true,
	"this": true,
	"throw": true,
	"throws": true,
	"transient": true,
	"true": true,
	"try": true,
	"typeof": true,
	"var": true,
	"void": true,
	"volatile": true,
	"while": true,
	"with": true,
	"yield": true,
};

/** These are token names we do not include in our member scope initialization. 
 * These variable names are also reserved. */
const JAVASCRIPT_IGNORE_NAMES = {
    "undefined": true,
    "Infinity": true,
    "NaN": true
}

/** These are variables we include in our member scope initialization and
 * we whitelist from globals. These variable names are also reserved. */
const JAVASCRIPT_WHITELIST_NAMES = {
    //javscript objects
    "Array": true,
    "Boolean": true,
    "Date": true,
    "Error": true,
    "JSON": true,
    "Math": true,
    "Number": true,
    "RegExp": true,
    "String": true,

    //javascript globals
    "decodeURI": true,
    "decodeURIComponent": true,
    "encodeURI": true,
    "encodeURIComponent": true,
    "escape": true, //javascript deprecated
    "eval": true,
    "isFinite": true,
    "isNaN": true,
    "parseFloat": true,
    "parseInt": true,
    "unescape": true, //javascript deprecated
    
    ///////////////////////////////////////////////////////////////////////////
    //web apis - NOTE - whitelist these based on platform! This is temporary!
    "console": true,
    ////////////////////////////////////////////////////////////////////////
}

/** These are internal apogee reserved names. */
const APOGEE_RESERVED_NAMES = {
    //global fucntions/values
    "__memberFunctionDebugHook": true,
    "__customControlDebugHook": true,
    "__memberFunctionDebugHook": true,
    "__globals__": true,

    //used in code compiler
    "__model": true,
    "__scopeManager": true,
    "__messenger": true,

    //other
    "apogeeMessenger": true
}

/** These are global values defnined by apogee, added to the globals whitelist */
const APOGEE_WHITELIST_NAMES = {
    //global fucntions/values
    "__memberFunctionDebugHook": true,
    "__customControlDebugHook": true,
    "__memberFunctionDebugHook": true,

    //libraries
    "apogeeutil": true,
    "_": true,

    //asynch alert functions
    "apogeeLog": true,
    "apogeeUserAlert": true,
    "apogeeUserConfirm": true,
    "apogeeUserConfirmSynchronous": true
}

/** These are internal apogee names we potentially inject into the sope of a given member. */
const APOGEE_SCOPE_INJECT_NAMES = {
    "apogeeMessenger": true
}

/** This function can be used to see if a variable name is reserved becaues it is reserved. */
export function isNameReserved(variableName) {
    let reservedResult = {reserved: false};
    if(KEYWORDS[variableName]) {
        reservedResult.message = "Javascript reserved keyword";
        reservedResult.reserved = true;
    }  
    else if((JAVASCRIPT_WHITELIST_NAMES[variableName])||(JAVASCRIPT_IGNORE_NAMES[variableName])) {
        reservedResult.message = "Javascript variable or value name";
        reservedResult.reserved = true;
    }
    else if(APOGEE_RESERVED_NAMES[variableName]) {
        reservedResult.message = "Apogee reserved name";
        reservedResult.reserved = true;
    }
    return reservedResult;
}

/** This function checks if the given variable name is a global name that is whitelisted. This only
 * contains whitelist elements from the base javascript and apogee language and does not include a facility
 * adding user defined values, such as module imports, to the whitelist. */
export function isInLanguageWhiteList(variableName) {
    return ((JAVASCRIPT_WHITELIST_NAMES[variableName])||(APOGEE_WHITELIST_NAMES[variableName]));
}

////////////////////////////////////////////////////////////////////////////////
/** This method returns the error list for this formula. It is only valid
 * after a failed call to analyzeCode. 
 *
 *  Error format: (some fields may not be present)
 *  {
 *      "description":String, //A human readable description of the error
 *      "lineNumber":Integer, //line of error, with line 0 being the function declaration, and line 1 being the start of the formula
 *      "index":Integer, //the character number of the error, including the function declaration:  "function() {\n" 
 *      "column":Integer, //the column of the error
 *      "stack":String, //an error stack
 *  }
 * */
////////////////////////////////////////////////////////////////////////////////

/** This method parses the code and returns a list of variabls accessed. It throws
 * an exception if there is an error parsing.
 **/
export function analyzeCode(functionText) {

    var returnValue = {};
    
    try {
        var ast = esprima.parse(functionText, { tolerant: true, loc: true, range: true });
    
        //check for errors in parsing
        if((ast.errors)&&(ast.errors.length > 0)) {
            returnValue.success = false;
            let {errorMsg,errorInfo} = createErrorInfoFromAstInfo(functionText,ast.errors);
            returnValue.errorMsg = errorMsg; 
            returnValue.errorInfo = errorInfo;
            return returnValue;
        }
        
        //get the variable list
        var varInfo = getVariableInfo(ast);

        //return the variable info
        returnValue.success = true;
        returnValue.varInfo = varInfo;
        return returnValue;
    }
    catch(internalError) {
        let {errorMsg,errorInfo} = createErrorInfoFromInternalError(functionText,internalError);
        returnValue.errorMsg = errorMsg; 
        returnValue.errorInfo = errorInfo;
        return returnValue;
    }
}

/** This method analyzes the AST to find the variabls accessed from the formula.
 * This is done to find the dependencies to determine the order of calculation. 
 * 
 * - The tree is composed of nodes. Each nodes has a type which correspondds to
 * a specific statement or other program syntax element. In particular, some
 * nodes correspond to variables, which we are collecting here.
 * - The variables are in two types of nodes, a simple Identifier node or a
 * MemberExpression, which is a sequence of Identifers.
 * - If the variable is a member, then this member is stored in the "depends on map"
 * - In addition to determining which variables a fucntion depends on, some modifiers
 * are also collected for how the variable is used. 
 * -- is declaration - this node should contain an identifier that is a declaration
 * of a local variable
 * @private */
function getVariableInfo(ast) {
    
    //create the var to hold the parse data
    var processInfo = {};
    processInfo.nameTable = {};
    processInfo.scopeTable = {};
    
    //create the base scope
    var scope = startScope(processInfo,FUNCTION_SCOPE); //program scope treated as function scope

    //traverse the tree, recursively
    processTreeNode(processInfo,ast,false);
    
    //finish the base scope
    endScope(processInfo,scope);
    
    //finish analyzing the accessed variables
    markLocalVariables(processInfo);
    
    //return the variable names accessed
    return processInfo.nameTable;
}
    
/** This method starts a new loca variable scope, it should be called
 * when a function or block starts. 
 * @private */
function startScope(processInfo,scopeType) {

    //initailize id gerneator
    if(processInfo.scopeIdGenerator === undefined) {
        processInfo.scopeIdGenerator = 0;
    }
    
    //create scope
    var scope = {};
    scope.type = scopeType;
    scope.id = String(processInfo.scopeIdGenerator++);
    scope.localVariables ={};
    
    //save this as the current scope
    processInfo.scopeTable[scope.id] = scope;
    if(scopeType == BLOCK_SCOPE) {
        //only update block scope
        scope.blockScopeParent = processInfo.currentBlockScope;
        processInfo.currentBlockScope = scope;
    }
    else {
        //update both block and function scope
        scope.blockScopeParent = processInfo.currentBlockScope;
        scope.functionScopeParent = processInfo.currentFunctionScope;
        processInfo.currentFunctionScope = scope;
        processInfo.currentBlockScope = scope;
    }

    return scope;
}

/** This method ends a local variable scope, reverting to the parent scope.
 * It should be called when a function or block exits. 
 * @private */
function endScope(processInfo,scope) {

    //a few tests
    if(!scope) {
        throw new Error("Scope undefined in end scope!");
    }

    //set the scope to the parent scope.
    if(scope.type == BLOCK_SCOPE) {
        if(scope != processInfo.currentBlockScope) throw new Error("Mismatch in current scope for end block scope!");
        processInfo.currentBlockScope = scope.blockScopeParent;
    }
    else if(scope.type == FUNCTION_SCOPE) {
        if(scope != processInfo.currentFunctionScope) throw new Error("Mismatch in current scope for end function scope!");
        processInfo.currentFunctionScope = scope.functionScopeParent;
        processInfo.currentBlockScope = scope.blockScopeParent;
    }
    else {
        throw new Error("Unrecognized scope: " + scope.type);
    }
}

/** This method analyzes the AST (abstract syntax tree). 
 * @private */
function processTreeNode(processInfo,node,isDeclaration,declarationKindInfo) {
    
    //process the node type
    if((node.type == "Identifier")||(node.type == "MemberExpression")) {
        //process a variable
        processVariable(processInfo,node,isDeclaration,declarationKindInfo);
    } 
    else if((node.type == "FunctionDeclaration")||(node.type == "FunctionExpression")||(node.type == "ArrowFunctionExpression")) {
        //process the functoin
        processFunction(processInfo,node); 
    }
    else if(node.type == "BlockStatement") {
        //process the block
        processBlock(processInfo,node);
    }
    else if((node.type == "ForStatement")||(node.type == "ForOfStatement")||(node.type == "ForInStatement")) {
        processFor(processInfo,node);
    }
    else if((node.type == "NewExpression")&&(node.callee.type == "Function")) {
        //we currently do not support the function constructor
        //to add it we need to add the local variables and parse the text body
        throw createParsingError("Function constructor not currently supported!",node.loc); 
    }
    else if(node.type == "VariableDeclaration") {
        //this is processed like a generic node, but we want to include the declaration kind for when
        //we do reach the variable we are declaring
        declarationKindInfo = node.kind;

        processGenericNode(processInfo,node,declarationKindInfo);
    }
    else {
        //process some other node
        processGenericNode(processInfo,node,declarationKindInfo);
    }
}
   
/** This method process nodes that are not variabls identifiers. This traverses 
 * down the syntax tree.
 * @private */
function processGenericNode(processInfo,node,declarationKindInfo) {
    //load the syntax node info list for this node
    var nodeInfoList = syntax[node.type];
    
    //process this list
    if(nodeInfoList === undefined) {
        //node not found
        throw createInternalParsingError("Syntax Tree Node not found: " + node.type,node.loc,node.range);
    }
    else if(nodeInfoList === null) {
        //node not supported
        throw createInternalParsingError("Syntax node not supported: " + node.type,node.loc,node.range);
    }
    else {
        //this is a good node - process it

        //-------------------------
        // process the node list
        //-------------------------
        for(var i = 0; i < nodeInfoList.length; i++) {
            //get node info
            var nodeInfo = nodeInfoList[i];
            
            //check if this field exists in node
            var childField = node[nodeInfo.name];
            if(childField) {
                
                if(nodeInfo.list) {
                    //this is a list of child nodes
                    for(var j = 0; j < childField.length; j++) {
                        processTreeNode(processInfo,childField[j],nodeInfo.declaration,declarationKindInfo);
                    }
                }
                else {
                    //this is a single node
                    processTreeNode(processInfo,childField,nodeInfo.declaration,declarationKindInfo);
                }
            }
        }
    }
}

/** This method processes nodes that are function. For functions a new scope is created 
 * for the body of the function.
 * @private */
function processFunction(processInfo,node) {

    //we allow async functions since they still return synchronously. But if we want to disallow them, we would do this
    // if(node.async) {
    //     throw new Error("Defining functions a async not allowed!");
    // }

    //we do not allow generator functions since they store state. Some uses are however safe.
    if(node.generator) {
        throw new Error("Defining generators is not allowed!");
    }

    var nodeType = node.type;
    var idNode = node.id;
    var params = node.params;
    var body = node.body;
    
    //difference here between the declaration and expression
    // - in declaration the name of the function is a variable in the parent scope
    // - in expression the name is typically left of. But it can be included, in which case
    //   it is a variable only in the child (function) scope. This lets the function call
    //   itself.
    
    if((nodeType === "FunctionDeclaration")&&(idNode)) {
        //parse id node (variable name) in the parent scope
        processTreeNode(processInfo,idNode,true);
    }
    
    //create a new scope for this function
    var scope = startScope(processInfo,FUNCTION_SCOPE);
    
    if((nodeType === "FunctionExpression")&&(idNode)) {
        //parse id node (variable name) in the function scope
        processTreeNode(processInfo,idNode,true);
    }

    //no id node (name) for arrow functions
    
    //process the variable list
    if(params) {
        for(var i = 0; i < params.length; i++) {
            processTreeNode(processInfo,params[i],true);
        }
    }
    
    //process the function body
    processTreeNode(processInfo,body,false);
    
    //end the scope for this function
    endScope(processInfo,scope);
}

/** This method processes a block node. A new block type scope is created for this.
 * Optionally, an array of additional nodes can be passed which will be processed within the block scope.
 * @private */
 function processBlock(processInfo,node,optionalInsideNodes) {
    var body = node.body;
    
    //create a new scope for this function
    var scope = startScope(processInfo,BLOCK_SCOPE);

    if(optionalInsideNodes) {
        optionalInsideNodes.forEach(node => {
            processTreeNode(processInfo,node,false);
        })
    }
    
    //process the block body
    for(var i = 0; i < body.length; i++) {
        processTreeNode(processInfo,body[i],false);
    }
    
    //end the scope for this function
    endScope(processInfo,scope);
}

/** This method processes nodes that are for for statements (including for in and for of).
 * These require some initializations inside the body rather than outside.
 * @private */
 function processFor(processInfo,node) {
    let body = node.body;
    let otherNodeList = [];

    if(node.type == "ForStatement") {
        otherNodeList.push(node.init);
        otherNodeList.push(node.test);
        otherNodeList.push(node.update);
    }
    else {
        otherNodeList.push(node.left);
        otherNodeList.push(node.right);
    }

    processBlock(processInfo,body,otherNodeList);
}

/** This method processes nodes that are variables (identifiers and member expressions), adding
 * them to the list of variables which are used in the formula.
 * @private */
function processVariable(processInfo,node,isDeclaration,declarationKindInfo) {
    
    //get the variable path and the base name
    var namePath = getVariableDotPath(processInfo,node);
    if(!namePath) return;
    
    var baseName = namePath[0];
    
    //check if it is an excluded name - such as a variable name used by javascript
    if(JAVASCRIPT_IGNORE_NAMES[baseName]) {
        return;
    }    

    //add to the name member
    var nameEntry = processInfo.nameTable[baseName];
    if(!nameEntry) {
        nameEntry = {};
        nameEntry.name = baseName;
        nameEntry.uses = [];

        if(APOGEE_SCOPE_INJECT_NAMES[baseName]) {
            nameEntry.scopeInjects = true;
        }
        
        processInfo.nameTable[baseName] = nameEntry;
    }
    
    //add a name use entry
    var nameUse = {};
    nameUse.path = namePath;
    nameUse.scope = processInfo.currentBlockScope; //we store the most specific use of the scope
    nameUse.node = node;

//OOPS - which scope to get here? BGoth? JUst one? I need to remember what this is for
    
    nameEntry.uses.push(nameUse);
    
    //if this is a declaration store it as a local varaible
    if(isDeclaration) {
        let declarationScope; 
        if((declarationKindInfo == "const")||(declarationKindInfo == "let")) {
            declarationScope = BLOCK_SCOPE;
        }
        else {
            //this case is declarationKindInfo = "var" or not defined, for example from a function arg list 
            declarationScope = FUNCTION_SCOPE;
        }

        //store this in the local variables for this scope
        let currentScope = (declarationScope == BLOCK_SCOPE) ? processInfo.currentBlockScope : processInfo.currentFunctionScope;
        if(!currentScope.localVariables[baseName]) {
            currentScope.localVariables[baseName] = true;
        }
        else {
            //the variable is being redeclared! that is ok.
        }
    }
}

/** This method returns the variable and its fields which are given by the node.
 * It may return null, meaning there is no variable to add to the dependency.  
 * See notes embedded in the code. It is possible to fool this into making a
 * dependecne on a parent (and all children) when all that is required is a 
 * single child. 
 * @private */
function getVariableDotPath(processInfo,node) {
    if(node.type == "Identifier") {
        //read the identifier name
        return [node.name];
    }
    else if(node.type == "MemberExpression") {
        if((node.object.type == "MemberExpression")||(node.object.type == "Identifier")) {
            //MEMBER EXPRESSION OR IDENTIFIER - variable name and/or path
            var variable = getVariableDotPath(processInfo,node.object);

            if(node.computed) {
                //COMPUTED CASE
                //We will not try to figure out what the child is. We will only make a dependence on 
                //the parent. This should work but it is too strong. For example
                //we may be including dependence on a while folder when really we depend
                //on a single child in the folder.
                processTreeNode(processInfo,node.property,false);
            }
            else {
                //append the member expression property to it
                variable.push(node.property.name);
            }

            return variable;
        }
        else {
            //something other than a variable as the object for the member expressoin
            //ignore the variable path after the call. We will set a dependence
            //on the parent which should work but is too strong. For example
            //we may be including dependence on a while folder when really we depend
            //on a single child in the folder.
            processTreeNode(processInfo,node.object,false);
            
            return null;
        }
    }
    else {
        //this shouldn't happen. If it does we didn't code the syntax tree right
        throw createInternalParsingError("Unknown application error: expected a variable identifier node.",node.loc,node.range);
    }
}

/** This method annotates the variable usages that are local variables. 
 * @private */
function markLocalVariables(processInfo) {
    for(var key in processInfo.nameTable) {
        var nameEntry = processInfo.nameTable[key];
        var name = nameEntry.name;
        var existNonLocal = false;
        for(var i = 0; i < nameEntry.uses.length; i++) {
            var nameUse = nameEntry.uses[i];
            var scope = nameUse.scope;
            //check if this name is a local variable in this scope or a parent scope
            var varScope = null;
            for(var testScope = scope; testScope; testScope = testScope.blockScopeParent) {
                if(testScope.localVariables[name]) {
                    varScope = testScope;
                    break;
                }
            }
            if(varScope) {
                //this is a local variable
                nameUse.isLocal = true;
                nameUse.declarationScope = varScope;
            }
            else {
                existNonLocal = true;
            }
        }
        //add a flag to the name enry if all uses are local
        if(!existNonLocal) {
            nameEntry.isLocal = true;
        }
    }
}


/** This method creates an error object. 
 * format:
 * {
 *     description:[string description],
 *     lineNumber:[integer line number, including function declaration line prepended to formula],
 *     column;[integer column on line number]
 * }
 * @private */
function createInternalParsingError(errorMsg,location,range) {
    let error = new Error(errorMsg);
    error.description = errorMsg;
    if(location) {
        error.column = location.start.column;
        error.lineNumber = location.start.line;
    }
    if(range) {
        error.index = range[0];
    }
    return error;
}

function createErrorInfoFromInternalError(functionText,internalError) {
    let errorInfo = {};
    errorInfo.type = "esprimaParseError";
    errorInfo.description = "Error parsing code: " + internalError.description;
    let errorMsg =  internalError.message ? internalError.message : internalError ? internalError.toString() : "Unknown";
    let errorData = {};
    if(internalError.lineNumber !== undefined) errorData.lineNumber = internalError.lineNumber;
    if(internalError.index !== undefined) errorData.index = internalError.index;
    if(internalError.column !== undefined) errorData.column = internalError.column;
    errorInfo.errors = [errorData]
    errorInfo.code = functionText;
    return {errorMsg,errorInfo};
}

/** this converts info from code analysis to a proper error */
function createErrorInfoFromAstInfo(functionText,astErrors) {
    let errorTextArray = astErrors.map(errorInfo => errorInfo.description);
    let errorMsg = "Error parsing user code: " + errorTextArray.join("; ");
    let errorInfo = {};
    errorInfo.type = "esprimaParseError";
    errorInfo.description = errorMsg;
    errorInfo.errors = astErrors;
    errorInfo.code = functionText;
    return {errorMsg,errorInfo};
}

const FUNCTION_SCOPE = "function";
const BLOCK_SCOPE = "block";