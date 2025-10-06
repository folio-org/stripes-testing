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

  checkUsercaneditPONumberIfNeeded: () => {
    cy.expect(editPoNumberCheckbox.exists());
    cy.do(editPoNumberCheckbox.checkIfNotSelected());
    cy.get('#clickable-save-config').then(($btn) => {
      if (!$btn.is(':disabled')) {
        cy.wrap($btn).click();
      }
    });
    cy.wait(2000);
  },

  userCanNotEditPONumber: () => {
    cy.wait(4000);
    cy.do(editPoNumberCheckbox.click());
    cy.wait(4000);
    cy.do(saveButton.click());
  },

  setPurchaseOrderLinesLimit: (polNumbers) => {
    // Need to wait,while input will be loaded(Settings menu has problems with interactors)
    cy.wait(10000);
    cy.get('input[name=value]').click().type(`{selectall}{backspace}${polNumbers}`);
    cy.wait(10000);
    cy.get('input[name=value]').click().type(`{selectall}{backspace}${polNumbers}`);
    cy.wait(10000);
    cy.do(Button({ id: 'set-polines-limit-submit-btn' }).click());
    InteractorsTools.checkCalloutMessage(
      'The limit of purchase order lines has been successfully saved',
    );
  },

  verifyPurchaseOrderLinesLimitValue: (value) => {
    cy.expect(TextField('Set purchase order lines limit').has({ value }));
  },

  fillRequiredFields: (info) => {
    cy.wait(6000);
    cy.do([
      TextField({ placeholder: 'name' }).fillIn(info.name),
      TextField({ placeholder: 'description' }).fillIn(info.description),
      saveButton.click(),
    ]);
    cy.wait(6000);
  },

  createPreffix(preffixInfo) {
    cy.wait(6000);
    cy.do(Button({ id: 'clickable-add-prefixes' }).click());
    this.fillRequiredFields(preffixInfo);
  },

  createPrefixViaApi(prefixName) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders/configuration/prefixes',
        body: {
          name: prefixName,
          description: 'Test prefix',
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body.id;
      });
  },

  createSuffix(suffixInfo) {
    cy.wait(6000);
    cy.do(Button({ id: 'clickable-add-suffixes' }).click());
    this.fillRequiredFields(suffixInfo);
  },

  createSuffixViaApi(suffixName) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders/configuration/suffixes',
        body: {
          name: suffixName,
          description: 'Test suffix',
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body.id;
      });
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

  deletePrefixViaApi(prefixId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `orders/configuration/prefixes/${prefixId}`,
      isDefaultSearchParamsRequired: false,
    });
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

  deleteSuffixViaApi(suffixId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `orders/configuration/suffixes/${suffixId}`,
      isDefaultSearchParamsRequired: false,
    });
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
