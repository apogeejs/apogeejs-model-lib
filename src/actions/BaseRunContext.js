import { doAction } from "/apogeejs-model-lib/src/actions/action.js";

export default class BaseRunContext {
    constructor() {
        this.state = "state_UNSET";
        this.newModel = null;
    }

    setStateValid(stateValid) {
        this.state = stateValid ? "state_OK" : "state_NOK";
    }

    registerModel(model) {
        this.newModel = model;
    }

    getState() {
        return this.state;
    }

    getCurrentModel() {
        let state = this.getState();
        if((state == "state_UNSET")&&(this.newModel)) {
            return this.newModel;
        }
        else {
            return this.getConfirmedModel();
        }
    }

    //Implement!!!
    //getConfirmedModel();

    executeAction(actionData) {
        let currentModel = this.getCurrentModel();

        if(currentModel.isActionInProgress()) {
            //This is an action sent durign an action calculation - do short circuit execution
            doAction(currentModel,actionData);
        }
        else {
            //this is an action passed in from outside
            //run this as an external command, asynchronously
            setTimeout(() => this.futureExecuteAction(currentModel.getId(),actionData),0); 
        }
    }

    //Implement this!!!
    //futureExecuteAction(modelId,actionData);



};