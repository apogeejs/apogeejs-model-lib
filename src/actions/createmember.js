import {addActionInfo} from "/apogeejs-model-lib/src/actions/action.js";
import Model from "/apogeejs-model-lib/src/data/Model.js";

/** This is self installing command module. This must be imported to install the command.
 * Note that this module also contains an export, unlike most command modules. 
 * The export us used so other actions can load child members. 
 *
 * Action Data format:
 * {
 *  "action": "createMember",
 *  "parentId": (parent for new member),
 *  "createData": 
 *      - name
 *      - unique member type name
 *      - additional member specific data
 *      - specialCaseIdValue (this is only to be used in special cases, to set the ID of the created object)
 *  
 * }
 *
 * MEMBER CREATED EVENT: "created"
 * Event member format:
 * {
 *  "member": (member)
 * }
 */


/** This is the action function to create a member. 
 * @private */
function createMemberAction(model,actionData) {
    
    let parent;
    if(actionData.modelIsParent) {
        //the parent is the model (It should already be mutable)
        parent = model;
    }
    else {
        //get the parent, as a new mutable instance
        parent = model.getMutableMember(actionData.parentId);

        if(!parent) {
            let actionResult = {};
            actionResult.actionDone = false;
            actionResult.errorMsg = "Parent not found for created member";
            return actionResult;
        }
    }

    let memberJson = actionData.createData;
    let actionResult = createMember(model,parent,memberJson);
    return actionResult;
}

/** This function creates a member and any children for that member, returning an action result for
 * the member. This is exported so create member can be used by other actions, such as load model. */
export function createMember(model,parent,memberJson) {

    let member;
    let errorMemberCreated = false;
    let actionResult = {};
    actionResult.event = ACTION_EVENT;
    
    //create member
    let typeConfig;
    if(memberJson) {
        typeConfig = Model.getMemberTypeConfig(memberJson.type);
    }

    if(typeConfig) {
        member = typeConfig.createMember(model,memberJson); 
    }
    else {
        //type not found! - create a dummy object and add an error to it
        let errorMemberTypeConfig = Model.getMemberTypeConfig("apogee.ErrorMember");
        member = errorMemberTypeConfig.createMember(parent,memberJson);
        member.setError(model,"Member type not found: " + memberJson.type);
        errorMemberCreated = true;
    }

    //this codde attempts to write  the member ID into the command that created the member.
    //We want this in our stored commands so we can use it for "redo" and have a member created
    //with the same ID. That way subsequent redo commands will correctly access the replacement member.
    //This doesn't seem like an optimal way to add this info to the input command. 
    //However, for now this is the earliest peice of code that actually touches each create action.
    //An alternative is to place a predetermined ID in the command before it is executed, in the 
    //command code. However, I didn't do that for now because there is not a one-to-one map from 
    //commands to actions. A single command often creates a hierarchy of members, all of which we 
    //would want to "modify". 
    try {
        if(!memberJson.specialCaseIdValue) {
            memberJson.specialCaseIdValue = member.getId();
        }
    }
    catch(error) {
        //we couldn't write into the command. It may be immutable
        //downstream redo commands won't work, but we'll cleanly handle that case then
        //with a failed redo.
    }

    //register member with model
    model.registerMember(member);

    //pass this child to the parent
    member.setParentId(parent.getId());
    parent.addChild(model,member);

    //set action flags for successfull new member
    actionResult.updateModelDependencies = true;
    if((member.hasCode)&&(member.hasCode())) {
        actionResult.recalculateMember = true;
    }
    else {
        actionResult.recalculateDependsOnMembers = true;
    }

    //instantiate children if there are any
    if((memberJson.children)&&(!errorMemberCreated)) {
        actionResult.childActionResults = [];
        for(let childName in memberJson.children) {
            let childJson = memberJson.children[childName];
            let childActionResult = createMember(model,member,childJson);
            actionResult.childActionResults.push(childActionResult);
        }
    }
    

    actionResult.member = member;
    actionResult.actionDone = true;

    return actionResult;
}

let ACTION_EVENT = "created";

//This line of code registers the action 
addActionInfo("createMember",createMemberAction);