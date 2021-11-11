import { doAction } from "/apogeejs-model-lib/src/actions/action.js";

/** This is a link to the run context, which holds the sequence of model instances for our calculation.
 * We should have a link for each model object. This is required for running any future command,
 * including asynchronous commands and messenger commands.
 */
export default class ModelRunContextLink {
    constructor(modelRunContext) {
        this.state = "state_UNSET";
        this.modelRunContext = modelRunContext;
        this.newModel = null;

        /* NOTE on model instance - The model instance is null if no new model instance is created for this
        * run context instance. In this case the model reverts to the current model from the parent model container,
        * such as the application, A potential problem is that furing the first action/command iteration, there will
        * be no model instance in the app.
        * - I think we expect a new model is created in that cycle. This may not be true. This idea should
        * be reveluated if needed.
        * - On alternative design is to hold the initial value of the model on context instantiation with a flag saying it is
        * the initial model. Then allow that to be overwritten but don't allow the new one to be overwritten.
        * - We might also need to re-evaluate if there can really be only one new model instance created for the run context
        * instance. For now I am pretty sure this is true.
        * */  
    }

    /** The state should be set "state_OK" if an instance of run context is accepted in the sequence
     * and to "state_NOK" if it is not acceped into the sequence. */
    setStateValid(stateValid) {
        this.state = stateValid ? "state_OK" : "state_NOK";
    }

    /** This retrieves the state of this run context instance. It is initially "state_UNSET" while the run context
     * and any associated actions are being run and once completed, setStateValid should be called to set the
     * proper state based on whether or not the instance was accepted in the sequence. */
    getState() {
        return this.state;
    }

    /** This method returns ture if this context instance is active, otherwise it returns false. The validity of
     * this depends on the context container setting the state after an action is run. */
    getIsActive() {
        return ((this.modelRunContext.getIsActive())&&(this.state != "state_NOK"));
    }

    /** This method should be called whenever a new model instance is created for the sequence.
     * NOTE - For a given run context object instance a model object should only be registered once.
     * If a second is registered, an exception with be thrown.
     */
    registerModel(model) {
        this.newModel = model;
    }
    
    /** This method returns the current model instance from the model sequence associated with the run context. */
    getCurrentModel() {
        let state = this.getState();
        if((state == "state_UNSET")&&(this.newModel)) {
            return this.newModel;
        }
        else {
            return this.modelRunContext.getConfirmedModel();
        }
    }

    /** This method executes an action against the model sequence.
     * (1) This includes short-circuit execution of 
     * actions, which is done is an action is currently in progress when this method is called. This is done assuming the 
     * action was triggered from within the model itself (such as through the messenger). In this case the action will execute
     * after the current action completes but before events are fired and the original "doAction" method returns.
     * (2) Alternately, the action will be run at a future time, using the futureExecuteAction function. */
    executeAction(actionData) {
        //if this context instance is not active, ignore command
        if(!this.getIsActive()) return;

        //we should have a current model as long as the context is active
        let currentModel = this.getCurrentModel();
        if(!currentModel) return;

        if(currentModel.isActionInProgress()) {
            //This is an action sent durign an action calculation - do short circuit execution
            doAction(currentModel,actionData);
        }
        else {
            //this is an action passed in from outside
            //run this as an external command, asynchronously
            //setTimeout(() => this.modelRunContext.futureExecuteAction(currentModel.getId(),actionData),0); 
            this.modelRunContext.futureExecuteAction(currentModel.getId(),actionData)
        }
    }

    futureExecuteAction(modelId,actionData) {
        this.modelRunContext.futureExecuteAction(modelId,actionData);
    }
};