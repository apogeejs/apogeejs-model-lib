import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import Messenger from "/apogeejs-model-lib/src/actions/Messenger.js";
import {processCode} from "/apogeejs-model-lib/src/lib/codeCompiler.js"; 
import {getDependencyInfo} from "/apogeejs-model-lib/src/lib/codeDependencies.js";
import ContextHolder from "/apogeejs-model-lib/src/datacomponents/ContextHolder.js";
import ContextManager from "/apogeejs-model-lib/src/lib/ContextManager.js";
import DependentMember from "/apogeejs-model-lib/src/datacomponents/DependentMember.js"

/** This mixin encapsulates an object in that can be coded. It contains a function
 * and supplemental code. Object that are codeable should also be a member and
 * dependent.
 * 
 * This is a mixin and not a class. It is used in the prototype of the objects that inherit from it.
 * 
 * COMPONENT DEPENDENCIES: 
 * - A Codeable must be ContextHolder
 * 
 * FIELD NAMES (from update event):
 * - argList
 * - functionBody
 * - private
 */
export default class CodeableMember extends DependentMember {

    /** This initializes the component. Added arguments over member:
     * - baseSetCodeOk - This type allows setting code
     * - baseSetDataOk - This type allows setting data
     */
    constructor(name,instanceToCopy,typeConfig,specialCaseIdValue,baseSetCodeOk,baseSetDataOk) {
        super(name,instanceToCopy,typeConfig,specialCaseIdValue);

        //mixin init where needed. This is not a scoep root. Parent scope is inherited in this object
        this.contextHolderMixinInit(false);
        this.baseSetCodeOk = baseSetCodeOk;
        this.baseSetDataOk = baseSetDataOk;
        
        //==============
        //Fields
        //==============
        //Initailize these if this is a new instance
        if(!instanceToCopy) {
            //arguments of the member function
            this.setField("argList",[]);
            //"functionBody";
            //"supplementalCode";
            //"compiledInfo"
            //and more...
        }
        
        //==============
        //Working variables
        //==============
        this.dependencyInitInProgress = false;
    }

    /** This property tells if this object is a codeable.
     * This property should not be implemented on non-codeables. */
    get isCodeable() {
        return true;
    } 

    /** This method returns the argument list.  */
    getArgList() {
        return this.getField("argList");
    }

    /** This method returns the fucntion body for this member.  */
    getFunctionBody() {
        return this.getField("functionBody");
    }

    /** This method returns the supplemental code for this member.  */
    getSupplementalCode() {
        return this.getField("supplementalCode");
    }

    /** This method returns the actual code that is executed. It will only return a valid result when there
     * is code that has been compiled for the member. */
    getCodeText() {
        let compiledInfo = this.getField("compiledInfo");
        if((compiledInfo)&&(compiledInfo.generatorFunction)) return compiledInfo.generatorFunction.toString();
        else return null;
    }

    /** This is a helper method that compiles the code as needed for setCodeInfo.*/
    applyCode(argList,functionBody,supplementalCode) {

        //save the code
        if(this.getField("argList").toString() != argList.toString()) {
            this.setField("argList",argList);
        }
        
        if(this.getField("functionBody") != functionBody) {
            this.setField("functionBody",functionBody);
        }
        
        if(this.getField("supplementalCode") != supplementalCode) {
            this.setField("supplementalCode",supplementalCode);
        }
        
        //process the code text into javascript code
        var compiledInfo = processCode(argList,functionBody,supplementalCode,this.getName());
        this.setField("compiledInfo",compiledInfo);
    }

    /** This method clears the function body and supplemental code, and
     * updates any associated variables, including the dependencies.  */
    clearCode(model) {
        if(this.getField("functionBody") != "") {
            this.setField("functionBody","");
        }
        if(this.getField("supplementalCode") != "") {
            this.setField("supplementalCode","");
        }
        this.clearField("compiledInfo");
        
        this.clearCalcPending();

        this.updateDependencies(model,[]);
    }

    /** This method returns the formula for this member.  */
    initializeDependencies(model) {

        let compiledInfo = this.getField("compiledInfo");
        
        if((this.hasCode())&&(compiledInfo.valid)) {
            //set the dependencies
            var dependsOnMap = getDependencyInfo(compiledInfo.varInfo,model,this.getCodeContextManager(model));
            this.updateDependencies(model,dependsOnMap);
            
        }
        else {
            //will not be calculated - has no dependencies
            this.updateDependencies(model,{});
        }
    }

    /** This method udpates the dependencies if needed because
     *the passed variable was added.  */
    updateDependeciesForModelChange(model,additionalUpdatedMembers) {
        let compiledInfo = this.getField("compiledInfo");
        if((compiledInfo)&&(compiledInfo.valid)) {
                    
            //calculate new dependencies
            let oldDependsOnMap = this.getDependsOn();
            let newDependsOnMap = getDependencyInfo(compiledInfo.varInfo,model,this.getCodeContextManager(model));

            if(!apogeeutil.jsonEquals(oldDependsOnMap,newDependsOnMap)) {
                //if dependencies changes, make a new mutable copy and add this to 
                //the updated values list
                let mutableMemberCopy = model.getMutableMember(this.getId());
                mutableMemberCopy.updateDependencies(model,newDependsOnMap);
                additionalUpdatedMembers.push(mutableMemberCopy);
            }
        }
    }

    /** This method returns the formula for this member.  */
    hasCode() {
        return this.getField("compiledInfo") ? true : false;
    }

    /** If this is true the member is ready to be executed. */
    memberUsesRecalculation() {
        return this.hasCode();
    }

    /** This method sets the data object for the member.  */
    calculate(model) {
        let compiledInfo = this.getField("compiledInfo");
        if(!compiledInfo) {
            this.setError(model,"Code not found for member: " + this.getName());
            this.clearCalcPending();
            return;
        }
        else if(!compiledInfo.valid) {
            let error = new Error(compiledInfo.errorMsg ? compiledInfo.errorMsg : "Unknown error parsing user code");
            if(compiledInfo.errorInfo) apogeeutil.appendErrorInfo(error,compiledInfo.errorInfo);
            this.setError(model,error);
            this.clearCalcPending();
            return;
        }
      
        try {
            this.processMemberFunction(model,compiledInfo.memberFunctionGenerator);
        }
        catch(error) {
            
            if(error == apogeeutil.MEMBER_FUNCTION_INVALID_THROWABLE) {
                //This is not an error. I don't like to throw an error
                //for an expected condition, but I didn't know how else
                //to do this. See notes where this is thrown.
                this.setResultInvalid(model);
            }
            else if(error == apogeeutil.MEMBER_FUNCTION_PENDING_THROWABLE) {
                //This is not an error. I don't like to throw an error
                //for an expected condition, but I didn't know how else
                //to do this. See notes where this is thrown.
                this.setResultPending(model);
            }
            else if(error.isDependsOnError) {
                //this is a depends on error from a member (presumably a fucntion table) we are calling
                this.setError(model,error);
            }
            //--------------------------------------
            else {            
                //this is an error in the code
                console.error("Error calculating member " + this.getFullName(model));
                if(error.stack) {
                    console.error(error.stack);
                }

                //create the extended error info - but only if this is an error object
                if(error instanceof Error) {
                    CodeableMember.storeMemberTraceInfo(model,error,this);

                    let errorInfo = {};
                    errorInfo.type = "runtimeError";
                    errorInfo.description = "Error in code evaluating member: " + this.getFullName(model);
                    if(error.stack) errorInfo.stack = error.stack;
                    errorInfo.memberTrace = CodeableMember.recallMemberTraceInfo(error);

                    apogeeutil.appendErrorInfo(error,errorInfo);
                }

                this.setError(model,error);
            }
        }
        
        this.clearCalcPending();
    }

    //----------------------------
    // Codeable Settings Methods
    //-----------------------------

    /** This method should be used to set the "noSave" field", either to true or false.
     * If the field is set to true, the base fields will automatically be set to the current state 
     * of the member fields. Alternatively, if a different base fields setting is desired, it can be passed
     * in with the argument optionalBaseFields. */
    setNoSave(noSave,optionalBaseFields) {
        if(this.getNoSaveChangeable()) {
            this.setField("noSave",noSave);
            if(noSave) {
                let fields;
                if(optionalBaseFields) {
                    fields = optionalBaseFields;
                }
                else {
                    fields = {};
                    this._writeCodeAndDataFields(fields);
                }
                this.setField("baseFields",fields)
            }
            else {
                this.clearField("noSave");
                this.clearField("baseFields");
            }
        }
    }

    /** This method sets the the "fieldsLocked" field. The lkocked fields refer just to the
     * code and data fields. */
    setFieldsLocked(fieldsLocked) {
        if(this.getFieldsLockedChangeable()) {
            this.setFields("fieldsLocked",fieldsLocked)
        }
    }

    
    /** This returns true if this member accepts setting the data. */
    getSetDataOk() {
        let fieldsLocked = this.getFieldsLocked();
        return (this.baseSetDataOk)&&(!fieldsLocked);
    }

    getSetCodeOk() {
        let fieldsLocked = this.getFieldsLocked();
        return (this.baseSetCodeOk)&&(!fieldsLocked);
    }

    getNoSave() {
        if(this.getNoSaveChangeable()) {
            return this.getField("noSave");
        }
        else return this.getDefaultNoSave();
    }

    getDefaultNoSave() {
        let typeConfig = this.getTypeConfig();
        if(typeConfig.defaultNoSave !== undefined) {
            return typeConfig.defaultNoSave;
        }
        else {
            return DEAFULT_NO_SAVE;
        }
    }

    getNoSaveChangeable() {
        let typeConfig = this.getTypeConfig();
        if(typeConfig.noSaveChangeable !== undefined) {
            return typeConfig.noSaveChangeable;
        }
        else {
            return DEAFULT_NO_SAVE_CHANGEABLE;
        }
    }

    getFieldsLocked() {
        if(this.getFieldsLockedChangeable()) {
            return this.getField("fieldsLocked");
        }
        else {
            return this.getDefaultFieldsLocked();
        }
    }

    getDefaultFieldsLocked() {
        let typeConfig = this.getTypeConfig();
        if(typeConfig.defaultFieldsLocked !== undefined) {
            return typeConfig.defaultFieldsLocked;
        }
        else {
            return DEAFULT_FIELDS_LOCKED;
        }
    }

    getFieldsLockedChangeable() {
        let typeConfig = this.getTypeConfig();
        if(typeConfig.fieldsLockedChangeable !== undefined) {
            return typeConfig.fieldsLockedChangeable;
        }
        else {
            return DEAFULT_FIELDS_LOCKED_CHANGEABLE;
        }
    }

    /** This gives a default value for data. It is valid only if the data is settable. */
     getDefaultDataValue() {
        let typeConfig = this.getTypeConfig();
        if(typeConfig.defaultDataValue !== undefined) {
            return typeConfig.defaultDataValue;
        }
        else {
            return DEFAULT_DATA;
        }
    }

    //------------------------------
    // Member Methods
    //------------------------------

    /** This gets an update structure to update a newly instantiated member
    /* to match the current object. */
    getFieldsJsonData() {
        let fields = {};

        //------------------
        //settings
        //------------------

        //no save
        let noSave = this.getNoSave();
        let defaultNoSave = this.getDefaultNoSave();
        if(noSave != defaultNoSave) {
            //save the value of "noSave" only if it differs from default
            fields.noSave = noSave;
        }

        //context parent generation
        let contextParentGeneration = this.getField("contextParentGeneration");
        if(contextParentGeneration) {
            //save it if it is defined and not 0 (that is implicit default)
            fields.contextParentGeneration = this.contextParentGeneration;
        }

        //fields locked
        let fieldsLocked = this.getFieldsLocked();
        let defaultFieldsLocked = this.getDefaultFieldsLocked();
        if(fieldsLocked != defaultFieldsLocked) {
            fields.fieldsLocked = fieldsLocked;
        }

        //-----------------
        // data and function body fields
        //-----------------

        //save fields for no save case
        if(noSave) {
            if(this.getNoSaveChangeable()) {
                //If no fields is changeable, we will store the "baseFields", which is the 
                //stored value to use at initialization.
                let baseFields = this.getField("baseFields");
                if(baseFields) {
                    Object.assign(fields,baseFields);
                };
                return fields;
            }
            else {
                //if the noSave field is not changeble, save nothing. Default will be loaded on open.
                return null;
            }
        }
        
        //normal case
        this._writeCodeAndDataFields(fields);

        return fields;
    }


    /** This writes the code and data fields to the given fields json. 
     * @private */
    _writeCodeAndDataFields(fields) {
        if(this.hasCode()) {
            fields.argList = this.getArgList();
            fields.functionBody = this.getFunctionBody();
            fields.supplementalCode = this.getSupplementalCode();
        }
        else {
            let state = this.getState();

            //handle the possible data value cases
            if(state == apogeeutil.STATE_INVALID) {
                //invalid valude
                fields.invalidValue = true;
            }
            else if(state == apogeeutil.STATE_PENDING) {
                //pending value - we can't do anything with this
                apogeeUserAlert("There is a pending result in a field being saved. This may not be saved properly.");
                fields.data = "<unknown pending value>";
            }
            else if(state == apogeeutil.STATE_ERROR) {
                //save the error - this is a non-code/explicitly set error
                let error = this.getError();
                if(error) {
                    fields.error = error.toString();
                    if(error.errorInfoList !== undefined) fields.errorInfoList = error.errorInfoList;
                    if(error.valueData !== undefined) fields.errorValueData = error.valueData;
                }
                else {
                    fields.error = "Unknown Error"; //unknonwn error
                }
            }
            else {
                //save the data value
                fields.data = this.getData();
            }
        }
    }

    /** This member initialized the codeable fields for a member. This should only be called during create. */
    loadFieldsForCreate(model,initialData) {
        //handle the no save case
        if(this.getNoSaveChangeable()) {
            let noSave = (initialData.noSave !== undefined) ? initialData.noSave : this.getDefaultNoSave();
            this.setField("noSave",noSave);
            if(noSave) {
                this.setField("baseFields",initialData);
            }
        }
        else if(this.getDefaultNoSave()) {
            //if the noSave is not changeable (hardcoded) apply the default fields from typeConfig
            let typeConfig = this.getTypeConfig();
            initialData = typeConfig.defaultFields;
        }

        //read the locked settings, if they are settable
        if(this.getFieldsLockedChangeable()) {
            let fieldsLocked = (initialData.fieldsLocked !== undefined) ? initialData.fieldsLocked : this.getDefaultFieldsLocked();
            this.setField("fieldsLocked",fieldsLocked);
        }

        //read context parent, defaults to none if not in initial data.
        if(initialData.contextParentGeneration) {
            this.setField("contextParentGeneration",initialData.contextParentGeneration);
        }

        //apply initial fields data/argList/functionBody/supplementalCode
        if( ((initialData.functionBody !== undefined)||(!this.baseSetDataOk)) && (this.baseSetCodeOk)) {
            //set code
            let argList = (initialData.argList !== undefined) ? initialData.argList : DEFAULT_ARG_LIST;
            let functionBody = (initialData.functionBody !== undefined) ? initialData.functionBody : DEFAULT_FUNCTION_BODY;
            let supplementalCode = (initialData.supplementalCode !== undefined) ? initialData.supplementalCode : DEFAULT_SUPPLEMENTAL_CODE;
            this.applyCode(argList,functionBody,supplementalCode);
        }
        else if(this.baseSetDataOk) {
            //set data
            if(initialData.error) {
                //reconstruct the error
                let error = new Error(initialData.error);
                if(initialData.errorInfoList) {
                    initialData.errorInfoList.forEach(errorInfo => apogeeutil.appendErrorInfo(errorInfo));
                }
                if(initialData.errorValueData) {
                    error.valueData = initialData.errorValueData;
                }
                this.setError(model,error);
            }
            else if(initialData.invalidValue) {
                this.setResultInvalid(model);
            }
            else {
                let data = (initialData.data !== undefined) ? initialData.data : this.getDefaultDataValue();
                this.setData(model,data);
            }

            //set the code fields to empty strings
            this.setField("functionBody",DEFAULT_FUNCTION_BODY);
            this.setField("supplementalCode",DEFAULT_SUPPLEMENTAL_CODE);
        }
    }

    //------------------------------
    //ContextHolder methods
    //------------------------------

    /** This method creates the context manager for this member. */
    createContextManager() {
        return new ContextManager(this);
    }

    //===================================
    // Protected Functions
    //===================================

    /** This function just returns the context manager for the code for this object. 
     * This is nominally the context manager for this object. However, There is an allowance
     * to use a replacement for the context manager as used in the code.
     * This is specifically intended for compound members where the end user is providing code,
     * such as through a form with expressions for input. In this case we want to code to be executed as
     * if it were on a different member. In the above menetioned case, the code should be from the parent page 
     * where the user is entering the form data. To do this, the contextParentGeneration should be set to 
     * the number of parent generations that should be used for the context member.
     */
    getCodeContextManager(model) {
        let contextMember;
        let contextParentGeneration = this.getField("contextParentGeneration");
        if(contextParentGeneration) {
            contextMember = this.getRemoteContextMember(model,contextParentGeneration);
        }
        else {
            contextMember = this;
        }

        return contextMember.getContextManager();
    }

    /** This function is used to get a remote context member */
    getRemoteContextMember(model,contextParentGeneration) {
        let contextMember = this;
        let parentCount = contextParentGeneration;
        while((parentCount)&&(contextMember)) {
            contextMember = contextMember.getParent(model);
            parentCount--;
        }
        //if we have not context member, revert to the local object
        if(!contextMember) contextMember = this;
        return contextMember;
    }

    //===================================
    // Private Functions
    //===================================

    //implementations must implement this function
    //This method takes the object function generated from code and processes it
    //to set the data for the object. (protected)
    //processMemberFunction 
    
    /** This makes sure user code of object function is ready to execute.  */
    initializeMemberFunction(model) {
        //we want to hold these as closure variables
        let functionInitialized = false;
        let functionInitializedSuccess = false;

        let memberFunctionInitializer = () => {
            
            if(functionInitialized) return functionInitializedSuccess;
            
            //make sure this in only called once
            if(this.dependencyInitInProgress) {
                this.setError(model,"Circular reference error");
                //clear calc in progress flag
                this.dependencyInitInProgress = false;
                functionInitialized = true;
                functionInitializedSuccess = false;
                return functionInitializedSuccess;
            }
            this.dependencyInitInProgress = true;
            
            try {
                //make sure the data is set in each impactor
                this.initializeImpactors(model);
                this.calculateDependentState(model,true);
                let state = this.getState();
                if((state == apogeeutil.STATE_ERROR)||(state == apogeeutil.STATE_PENDING)||(state == apogeeutil.STATE_INVALID)) {
                    //stop initialization if there is an issue in a dependent
                    this.dependencyInitInProgress = false;
                    functionInitialized = true;
                    functionInitializedSuccess = false;
                    return functionInitializedSuccess;
                }
                
                //set the context
                let compiledInfo = this.getField("compiledInfo");
                let messenger = new Messenger(model,this);
                compiledInfo.memberFunctionContextInitializer(model,this.getCodeContextManager(model),messenger);
                
                functionInitializedSuccess = true;
            }
            catch(error) {
                //LATER NOTE - I think this is an internal error if we get an error here
                //initializeImpactor will catch errors in user code of other members.
                //the other function calls above should not throw errors, in theory
                //investigate this more...
                if(error.stack) {
                    console.error(error.stack);
                }

                this.setError(model,error);
                functionInitializedSuccess = false;
            }
            
            this.dependencyInitInProgress = false;
            functionInitialized = true;
            return functionInitializedSuccess;
        }

        return memberFunctionInitializer();

    }

    //============================
    // Static
    //============================

    /** This method is used to add trace of members whose code was called */
    static storeMemberTraceInfo(model,error,member) {
        //only store member trace on an error object
        if(!(error instanceof Error)) return;

        if(!error.memberTrace) {
            error.memberTrace = [];
        }
        let memberInfo = {};
        memberInfo.id = member.getId();
        memberInfo.name = member.getFullName(model);
        if(member.getCodeText) memberInfo.code = member.getCodeText();
        error.memberTrace.push(memberInfo);
    }

    static recallMemberTraceInfo(error) {
        return error.memberTrace;
    }

}

//add components to this class
apogeeutil.mixin(CodeableMember,ContextHolder);


//default optional settings values
const DEAFULT_NO_SAVE = false;
const DEAFULT_NO_SAVE_CHANGEABLE = true;
const DEAFULT_FIELDS_LOCKED = false;
const DEAFULT_FIELDS_LOCKED_CHANGEABLE = true;

const DEFAULT_ARG_LIST = "";
const DEFAULT_FUNCTION_BODY = "";
const DEFAULT_SUPPLEMENTAL_CODE = "";
const DEFAULT_DATA = "";
