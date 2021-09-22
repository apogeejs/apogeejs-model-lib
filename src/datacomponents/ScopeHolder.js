/** This component encapsulates an object that has a scope manager.
 * 
 * This is a mixin and not a class. It is used for the prototype of the objects that inherit from it.
 * 
 * COMPONENT DEPENDENCIES:
 */
let ScopeHolder = {};
export {ScopeHolder as default};

/** This initializes the component */
ScopeHolder.scopeHolderMixinInit = function(isScopeRoot) {
    this.isScopeRoot = isScopeRoot;

    //&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
    //What kind of field is this? Dependent?
    //will be set on demand
    this.scopeManager = null;
    //&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
}

ScopeHolder.isScopeHolder = true;

/** This method retrieves the scope manager. */
ScopeHolder.getScopeManager = function() {
    if(!this.scopeManager) {
        //set the scope manager
        this.scopeManager = this.createScopeManager();
    }
    
    return this.scopeManager;
}

ScopeHolder.getIsScopeRoot = function() {
    return this.isScopeRoot;
}

//this method must be implemneted in extending classes
///** This method retrieve creates the loaded scope manager. */
//ScopeHolder.createScopeManager = function();





