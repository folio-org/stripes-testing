import {
  Button,
  Checkbox,
  EditableListRow,
  MultiColumnListCell,
  NavListItem,
  PaneHeader,
  Section,
  Select,
  TextField,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const editPoNumberCheckbox = Checkbox('User can edit');
const saveButton = Button('Save');
const trashIconButton = Button({ icon: 'trash' });
const deleteButton = Button('Delete');
function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}

export default {
  waitLoadingOrderSettings: () => {
    cy.expect(Section({ id: 'settings-nav-pane' }).exists());
  },

  waitLoadingEditPONumber: () => {
    cy.expect(PaneHeader('Edit').exists());
  },

  waitLoadingOpeningPurchaseOrders: () => {
    cy.expect(PaneHeader('Opening purchase orders').exists());
  },

  expectDisabledCheckboxIsOpenOrderEnabled: () => {
    cy.expect(Checkbox({ name: 'isOpenOrderEnabled' }).disabled());
  },

  waitLoadingPurchaseOrderLinesLimit: () => {
    cy.expect(PaneHeader('Purchase order lines limit').exists());
  },

  waitLoadingInstanceStatus: () => {
    cy.expect(PaneHeader('Instance status').exists());
  },

  waitLoadingInstanceType: () => {
    cy.expect(PaneHeader('Instance type').exists());
  },

  waitLoadingLoanType: () => {
    cy.expect(PaneHeader('Loan type').exists());
  },

  userCanEditPONumber: () => {
    cy.wait(4000);
    cy.do(editPoNumberCheckbox.click());
    cy.wait(4000);
    cy.do(saveButton.click());
  },

  userCanNotEditPONumber: () => {
    cy.wait(4000);
    cy.do(editPoNumberCheckbox.click());
    cy.wait(4000);
    cy.do(saveButton.click());
  },

  setPurchaseOrderLinesLimit: (polNumbers) => {
    // Need to wait,while input will be loaded(Settings menu has problems with interactors)
    cy.wait(8000);
    cy.get('input[name=value]').click().type(`{selectall}{backspace}${polNumbers}`);
    cy.wait(4000);
    cy.get('input[name=value]').click().type(`{selectall}{backspace}${polNumbers}`);
    cy.wait(4000);
    cy.do(Button({ id: 'set-polines-limit-submit-btn' }).click());
    InteractorsTools.checkCalloutMessage(
      'The limit of purchase order lines has been successfully saved',
    );
  },

  fillRequiredFields: (info) => {
    cy.wait(6000);
    cy.do([
      TextField({ placeholder: 'name' }).fillIn(info.name),
      TextField({ placeholder: 'description' }).fillIn(info.description),
      saveButton.click(),
    ]);
  },

  createPreffix(preffixInfo) {
    cy.wait(6000);
    cy.do(Button({ id: 'clickable-add-prefixes' }).click());
    this.fillRequiredFields(preffixInfo);
  },

  createSuffix(suffixInfo) {
    cy.wait(6000);
    cy.do(Button({ id: 'clickable-add-suffixes' }).click());
    this.fillRequiredFields(suffixInfo);
  },

  deletePrefix: (preffixInfo) => {
    cy.wait(6000);
    cy.do(
      MultiColumnListCell({ content: preffixInfo.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([getEditableListRow(rowNumber).find(trashIconButton).click(), deleteButton.click()]);
      }),
    );
    InteractorsTools.checkCalloutMessage(`The prefix ${preffixInfo.name} was successfully deleted`);
  },

  deleteSuffix: (suffixInfo) => {
    cy.wait(6000);
    cy.do(
      MultiColumnListCell({ content: suffixInfo.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([getEditableListRow(rowNumber).find(trashIconButton).click(), deleteButton.click()]);
      }),
    );
    InteractorsTools.checkCalloutMessage(`The suffix ${suffixInfo.name} was successfully deleted`);
  },

  selectInstanceStatus(status) {
    cy.wait(6000);
    cy.do([
      Select({ name: 'inventory-instanceStatusCode' }).choose(status),
      Button({ id: 'clickable-save-config' }).click(),
    ]);
    InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
  },

  selectInstanceType(type) {
    cy.wait(6000);
    cy.do([
      Select({ name: 'inventory-instanceTypeCode' }).choose(type),
      Button({ id: 'clickable-save-config' }).click(),
    ]);
    InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
  },

  selectLoanType(type) {
    cy.wait(6000);
    cy.do([
      Select({ name: 'inventory-loanTypeName' }).choose(type),
      Button({ id: 'clickable-save-config' }).click(),
    ]);
    InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
  },

  selectContentInGeneralOrders(content) {
    cy.do(NavListItem(content).click());
  },

  selectApprovalRequired() {
    cy.do([Checkbox({ name: 'isApprovalRequired' }).click(), saveButton.click()]);
  },
};
