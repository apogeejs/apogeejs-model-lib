import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import Model from "/apogeejs-model-lib/src/data/Model.js";
import CodeableMember from "/apogeejs-model-lib/src/datacomponents/CodeableMember.js";

/** This class encapsulatees a data member for a JSON object. 
 * (This object does also support function objects as elements of the json, though
 * objects using this, such as the JsonComponent, may not.)
*/
export default class DataMember extends CodeableMember {

    constructor(name,instanceToCopy,typeConfig,specialCaseIdValue) {
        super(name,instanceToCopy,typeConfig,specialCaseIdValue,true/* setCodeOk */,true/* setDataOk */);
    }

    //------------------------------
    // Codeable Methods
    //------------------------------

    /** This method returns the argument list. We override it because
     * for DataMember it gets cleared when data is set. However, whenever code
     * is used we want the argument list to be this value. */
    getArgList() {
        return [];
    }
        
    /** This is he process member function from codeable. */
    processMemberFunction(model,memberGenerator,memberCalculateStack) {
        let initialized = this.initializeMemberFunction(model,memberCalculateStack);
        if(initialized) {
            //the data is the output of the function
            let memberFunction = memberGenerator();
            let data = memberFunction();
            this.applyData(model,data);

            //we must separately apply the asynch data set promise if there is one
            if((data)&&(data instanceof Promise)) {
                this.applyAsynchFutureValue(model,data);
            }
        } 
    }

    //------------------------------
    // Member Methods
    //------------------------------

    /** This method extends set data from member. It also
     * freezes the object so it is immutable. (in the future we may
     * consider copying instead, or allowing a choice)*/
    setData(model,data) {
        
        //make this object immutable
        apogeeutil.deepFreeze(data);

        //store the new object
        return super.setData(model,data);
    }
}

/** This function creates a new instance */ 
function createMember(model,json) {
    let member = new DataMember(json.name,null,TYPE_CONFIG,json.specialCaseIdValue);
    member.loadFieldsForCreate(model,json.fields);
    return member;
}

const TYPE_CONFIG = {
    type: "apogee.DataMember",
    createMember: createMember
}

Model.registerTypeConfig(TYPE_CONFIG);