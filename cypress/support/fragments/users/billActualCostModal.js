import { HTML } from '@interactors/html';
import {
  including,
  Button,
  Modal,
  TextField,
  KeyValue,
  TextArea,
  Callout,
  calloutTypes,
} from '../../../../interactors';

const rootModal = Modal({ id: 'actualCost' });
const continueButton = Button({ id: 'continueActualCost' });
const cancelButton = Button({ id: 'cancelActualCost' });
const closeButton = Button({ id: 'actualCost-close-button' });
const actualCostToBillTextField = TextField({ id: including('text-input') });
const additionalInfoStaffTextField = TextArea('Additional information for staff');
const additionalInfoPatronTextField = TextArea('Additional information for patron');
const confirmButton = Button({ id: 'confirmActualCost' });
const keepEditingButton = Button({ id: 'keepEditingActualCost' });

export default {
  waitLoading: () => cy.expect(rootModal.exists()),
  closeModal: () => cy.do(closeButton.click()),
  continue: () => {
    cy.expect(continueButton.exists());
    cy.do(continueButton.click());
  },
  confirm: () => cy.do(confirmButton.click()),
  keepEditing: () => cy.do(keepEditingButton.click()),
  cancel: () => cy.do(cancelButton.click()),
  checkConfirmModalInfo: (
    data = {
      actualCost: 10.0,
      instanceTitle: '',
      username: '',
      firstName: '',
      middleName: 'testMiddleName',
      itemType: 'unspecified',
      staffInfo: '-',
      patronInfo: '-',
    },
  ) => {
    cy.expect([
      Modal(including(`Confirm actual cost to bill ${data.username}, ${data.firstName}`)).exists(),
      HTML(
        including(
          `A fee/fine of ${data.actualCost} will be charged to ${data.username}, ${data.firstName}, ${data.middleName} for ${data.instanceTitle} (${data.itemType}).`,
        ),
      ),
      KeyValue('Additional information for staff').has({ value: including(data.staffInfo) }),
      KeyValue('Additional information for patron').has({ value: including(data.patronInfo) }),
      confirmButton.exists(),
      keepEditingButton.exists(),
    ]);
  },
  checkActualCostFieldValidation(value) {
    cy.expect([
      actualCostToBillTextField.has({ value }),
      actualCostToBillTextField.has({
        error: 'Actual cost to bill patron must be greater than 0.00 and less than 9999.99',
      }),
      continueButton.has({ disabled: true }),
    ]);
  },
  checkModalInfo: (
    user,
    owner,
    data = { actualCost: '', staffInfo: '', patronInfo: '', continueBtnDisabled: true },
  ) => {
    cy.expect([
      Modal(including(`Actual cost to bill ${user.username}, ${user.firstName}`)).exists(),
      KeyValue('Fee/fine owner').has({ value: owner.owner }),
      KeyValue('Fee/fine type').has({ value: 'Lost item fee (actual cost)' }),
      actualCostToBillTextField.has({ value: data.actualCost }),
      additionalInfoStaffTextField.has({ value: data.staffInfo }),
      additionalInfoPatronTextField.has({ value: data.patronInfo }),
      cancelButton.has({ disabled: false }),
      continueButton.has({ disabled: data.continueBtnDisabled }),
    ]);
  },
  fillActualCost(value) {
    cy.do([actualCostToBillTextField.fillIn(value), actualCostToBillTextField.blur()]);
  },
  fillAdditionalInfoInputs(staffInfo, patronInfo) {
    cy.do([
      additionalInfoStaffTextField.fillIn(staffInfo),
      additionalInfoPatronTextField.fillIn(patronInfo),
    ]);
  },
  verifyCalloutMessage(user, actualCost) {
    cy.expect(
      Callout({ type: calloutTypes.success }).is({
        textContent: `A fee/fine of ${actualCost} has been successfully charged to ${user.username}, ${user.firstName} testMiddleName`,
      }),
    );
  },
};
