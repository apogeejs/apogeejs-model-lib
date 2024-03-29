import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import Model from "/apogeejs-model-lib/src/data/Model.js";
import CodeableMember from "/apogeejs-model-lib/src/datacomponents/CodeableMember.js";

/** This is a function. */
export default class FunctionMember extends CodeableMember {

    constructor(name,instanceToCopy,typeConfig,specialCaseIdValue) {
        super(name,instanceToCopy,typeConfig,specialCaseIdValue,true/* setCodeOk */,false/* setDataOk */);
    }
    
    //------------------------------
    // Codeable Methods
    //------------------------------

    processMemberFunction(model,memberGenerator) {
        var memberFunction = this.getLazyInitializedMemberFunction(model,memberGenerator);
        this.setData(model,memberFunction);
    }

    getLazyInitializedMemberFunction(model,memberGenerator) {

        //create init member function for lazy initialization
        //we need to do this for recursive functions, or else we will get a circular reference
        //here we have logic to notify of an error or other problem in the function
        var initMember = () => {
            var impactorSuccess = this.initializeMemberFunction(model);
            if(impactorSuccess) {
                //this returns the member function
                return memberGenerator();
            }
            else {
                //error handling
                let issue;
                let state = this.getState();

                //in the case of "result invalid" or "result pending" this is 
                //NOT an error. But I don't know
                //how else to stop the calculation other than throwing an error, so 
                //we do that here. It should be handled by anyone calling a function.
                if(state == apogeeutil.STATE_ERROR) {
                    //throw a depends on error
                    //it will be recieved by the member that triggered this init, if applicable
                    issue = FunctionMember.createDependsOnError(model,[this]);
                }
                else if(state == apogeeutil.STATE_PENDING) {
                    issue = apogeeutil.MEMBER_FUNCTION_PENDING_THROWABLE;
                }
                else if(state == apogeeutil.STATE_INVALID) {
                    issue = apogeeutil.MEMBER_FUNCTION_INVALID_THROWABLE;
                }
                else {
                    issue = new Error("Unknown problem in initializing: " + this.getName());
                }
                
                throw issue;
            } 
        }

        //create the lazy initialize function
        let memberInitialized = false;
        let source = {};

        source.initIfNeeded = () => {
            if(!memberInitialized) {
                memberInitialized = true;
                source.memberFunction = initMember();
            }
        }

        source.handleError = error => {
            console.error("Error in function call to " + this.getName());
            CodeableMember.storeMemberTraceInfo(model,error,this);
            throw error;
        }

        //create the wrapped function - we call this from the debug file to make this cleaner for the
        //user, since they will run through it from the debugger.
        let wrappedMemberFunction = __functionMemberWrapper(this.getName(),source);

        //add an function on this function to allow external initialization if needed (if the function is not called before the model is locked)
        wrappedMemberFunction.initIfNeeded = source.initIfNeeded;

        return wrappedMemberFunction;
    }

    /** The function is lazy initialized so it can call itself without a 
     * ciruclar reference. The initialization happens on the first actual call. This is OK if we are doing the
     * model calculation. but if it is first called _AFTER_ the model has completed being calculated, such as
     * externally, then we will get a locked error when the lazy initialization happens. Instead, we will
     * complete the lazy initialization before the lock is done. At this point we don't need to worry about
     * circular refernce anyway, since the model has already completed its calculation. */
    lazyInitializeIfNeeded() {
        //check if the function is initialized
        let memberFunction = this.getData();
        if((memberFunction)&&(memberFunction.initIfNeeded)) {
            try {
                memberFunction.initIfNeeded();
            }
            catch(error) {
                //this error is already handled in the function member initializer
                //it is rethrown so a calling member can also get the error, since it was not present at regular intialization
                //if we initialize here in lock, that means there is nobody who called this.
            }
        }
    }

    //------------------------------
    // Member Methods
    //------------------------------

    /** This method executes a property update. */
    getPropertyUpdateAction(model,newValues) {
        if((newValues.fields)&&(newValues.fields.argList !== undefined)) {
            var actionData = {};
            actionData.action = "updateCode";
            actionData.memberId = this.getId();
            actionData.argList = newValues.fields.argList;
            actionData.functionBody = this.getFunctionBody();
            actionData.supplementalCode = this.getSupplementalCode();
            return actionData;
        }
        else {
            return null;
        }
    }

}

/** This function creates a new instance */ 
function createMember(model,json) {
    let member = new FunctionMember(json.name,null,TYPE_CONFIG,json.specialCaseIdValue);
    member.loadFieldsForCreate(model,json.fields);
    return member;
}

const TYPE_CONFIG = {
    type: "apogee.FunctionMember",
    createMember: createMember
}

Model.registerTypeConfig(TYPE_CONFIG);

