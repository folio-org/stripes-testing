import { Pane, Checkbox, TextArea, Button } from '../../../../../interactors';
import Callout from '../../../../../interactors/callout';
import { REQUEST_METHOD } from '../../../constants';

export default class Condition {
  static blockCheckboxes = {
    borrowing: Checkbox({ id: 'blockBorrowing' }),
    renewals: Checkbox({ id: 'blockRenewals' }),
    requests: Checkbox({ id: 'blockRequests' }),
  };

  constructor(conditionName) {
    this._rootPane = Pane(conditionName);
    this._message = this._rootPane.find(TextArea({ id: 'message' }));
    this._saveButton = this._rootPane.find(Button('Save'));
  }

  clickByCheckbox(specialBlockCheckbox) {
    cy.do(specialBlockCheckbox.clickAndBlur());
  }

  setMessage(text) {
    cy.do(this._message.fillIn(text));
  }

  checkSaveButtonState(isDisabled) {
    cy.expect(this._saveButton.has({ disabled: isDisabled }));
  }

  checkInitialState() {
    Object.values(Condition.blockCheckboxes).forEach((blockCheckbox) => {
      cy.expect(this._rootPane.find(blockCheckbox).exists());
      cy.expect(this._rootPane.find(blockCheckbox).has({ disabled: false }));
      cy.expect(this._rootPane.find(blockCheckbox).has({ checked: false }));
      cy.expect(this._message.has({ textContent: '' }));
      this.checkSaveButtonState(true);
    });
  }

  // check red asterik presence
  checkRequiredMessageField() {
    cy.expect(this._rootPane.find(TextArea('Message to be displayed*')).exists());
  }

  trySave() {
    cy.do(this._saveButton.click());
  }

  checkEmptyMessageValidation() {
    cy.expect(
      this._message.has({
        error:
          'Message to be displayed is a required field if one or more Blocked actions selected',
      }),
    );
  }

  checkRequiredCheckboxValidation() {
    cy.expect(
      this._message.has({
        error:
          'One or more Blocked actions must be selected for Message to be displayed to be used',
      }),
    );
  }

  save(specialConditionValue) {
    cy.intercept('/patron-block-conditions').as('getCurrentConditions');
    this.trySave();
    cy.do(
      Callout(
        `The patron block condition ${specialConditionValue} has been successfully updated.`,
      ).dismiss(),
    );
    cy.wait('@getCurrentConditions');
    cy.expect(
      Callout(
        `The patron block condition ${specialConditionValue} has been successfully updated.`,
      ).absent(),
    );
    this.checkSaveButtonState(true);
  }

  static _defaultCondition = {
    // required field, should be defined initially
    id: undefined,
    // required field, should be defined initially
    name: undefined,
    blockBorrowing: false,
    blockRenewals: false,
    blockRequests: false,
    valueType: 'Integer',
    message: '',
  };

  static updateViaAPI(conditionId, conditionValue) {
    const specialCondition = { ...this._defaultCondition };
    specialCondition.id = conditionId;
    specialCondition.name = conditionValue;

    cy.okapiRequest({
      method: REQUEST_METHOD.PUT,
      path: `patron-block-conditions/${conditionId}`,
      body: specialCondition,
      isDefaultSearchParamsRequired: false,
    });
  }
}
