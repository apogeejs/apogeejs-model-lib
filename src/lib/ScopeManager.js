import {isInLanguageWhiteList} from "/apogeejs-model-lib/src/lib/codeAnalysis.js"; 

/** This class manages variable scope for the user code. It is used to look up 
 * variables both to find dependencies in member code or to find the value for
 * member code execution.
 * 
 * It has two lookup functions. "getMember" looks up members and is used to 
 * find dependencies. "getValue" looks up member values, for evaluating member values.
 * 
 * When a lookup is done, the named member/value is looked up in the local member scope. If it is not found,
 * the search is then done in the parent of the member. This chain continues until we reach a "root" object,
 * an example of which is the model object itself.
 * 
 * The root object has a lookup like the other scope manager objects, however, if a lookup fails
 * to fins something, it does a lookup on global javascript variables. (Any filtering on this is TBD)
 * 
 * In the local scope for each scope holder there is a scope list, that allows for a number of entries. 
 * Currently the only one type of entry - parent entry. It looks up children of the current object.
 * 
 * In the future we can add imports for the local scope, and potentially other lookup types. 
 * */
export default function ScopeManager(scopeHolder) {
    this.scopeHolder = scopeHolder;

    this.scopeList = [];
}

ScopeManager.prototype.addToScopeList = function(entry) {
    this.scopeList.push(entry);
}

ScopeManager.prototype.removeFromScopeList = function(entry) {
    var index = this.scopeList.indexOf(entry);
    if(index >= 0) {
        this.scopeList.splice(index,1);
    }
}

ScopeManager.prototype.clearScopeList = function() {
    this.scopeList = [];
}

ScopeManager.prototype.getValue = function(model,varName) {
    var data = this.lookupValue(model,varName);
    
    //if the name is not in this scope, check with the parent scope
    if(data === undefined) {
        if((this.scopeHolder)&&(!this.scopeHolder.getIsScopeRoot())) {
            var parent = this.scopeHolder.getParent(model);
            if(parent) {
                var parentScopeManager = parent.getScopeManager();
                data = parentScopeManager.getValue(model,varName);
            }
        }
    }
    
    return data;
}

ScopeManager.prototype.getMember = function(model,pathArray) {
    let index = 0;
    var impactor = this.lookupMember(model,pathArray,index);
    
    //if the object is not in this scope, check with the parent scope
    if(!impactor) {
        if((this.scopeHolder)&&(!this.scopeHolder.getIsScopeRoot())) {
            var parent = this.scopeHolder.getParent(model);
            if(parent) {
                var parentScopeManager = parent.getScopeManager();
                impactor = parentScopeManager.getMember(model,pathArray);
            }
        }
    }
    
    return impactor;
}

//==================================
// Private Methods
//==================================

/** Check each entry of the scope list to see if the data is present. */
ScopeManager.prototype.lookupValue = function(model,varName) {
    var data;
    let childFound = false;
    for(var i = 0; i < this.scopeList.length; i++) {
        var entry = this.scopeList[i];        
        if(entry.scopeHolderAsParent) {
            //for parent entries, look up the child and read the data
            var child = this.scopeHolder.lookupChild(model,varName);
            if(child) {
                data = child.getData();
                childFound = true;
            }
        }
        
        if(childFound) return data;
    }

    if(this.scopeHolder.getIsScopeRoot()) {
        data = this.getValueFromGlobals(varName);

        if(data != undefined) {
            return data;
        }
    }
    
    return undefined;
}

ScopeManager.prototype.lookupMember = function(model,pathArray,index) {
    var impactor;
    for(var i = 0; i < this.scopeList.length; i++) {
        var entry = this.scopeList[i];        
        if(entry.scopeHolderAsParent) {
            //for parent entries, look up the child and read the data
            impactor = this.scopeHolder.lookupChild(model,pathArray[index]);

            if((impactor)&&(impactor.isScopeHolder)) {
                let childImpactor = impactor.getScopeManager().lookupMember(model,pathArray,index+1);
                if(childImpactor) {
                    impactor = childImpactor;
                }
            }

        }
        //no lookup in data entries
        
        if(impactor) return impactor;
    }
    
    return undefined;
}

ScopeManager.prototype.getValueFromGlobals = function(varName) {

    //try to read from platform
    let platformValue = getModelGlobal(varName);
    if(platformValue !== undefined) return platformValue;

    //try to read from javascript globals - whitelisted only
    if(isInLanguageWhiteList(varName)) return __globals__[varName];
    else return undefined;
}



