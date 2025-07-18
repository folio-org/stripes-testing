import uuid from 'uuid';
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
import Configs from '../configs';

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
    cy.wait(10000);
    cy.get('input[name=value]')
      .invoke('val')
      .then((currentValue) => {
        const current = String(currentValue).trim();
        const desired = String(polNumbers).trim();
        if (current !== desired) {
          cy.get('input[name=value]').click().type(`{selectall}{backspace}${desired}`);
          cy.wait(10000);
          cy.get('input[name=value]').click().type(`{selectall}{backspace}${desired}`);
          cy.wait(10000);
          cy.do(Button({ id: 'set-polines-limit-submit-btn' }).click());
          InteractorsTools.checkCalloutMessage(
            'The limit of purchase order lines has been successfully saved',
          );
        }
      });
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

  generateUserCanEditPONumberConfig(canUserEditOrderNumber = false) {
    return {
      value: JSON.stringify({ canUserEditOrderNumber }),
      module: 'ORDERS',
      configName: 'orderNumber',
      id: uuid(),
    };
  },

  getUserCanEditPONumberViaApi() {
    return Configs.getConfigViaApi({ query: '(module==ORDERS and configName==orderNumber)' });
  },

  setUserCanEditPONumberViaApi(canUserEditOrderNumber) {
    this.getUserCanEditPONumberViaApi().then((configs) => {
      if (configs[0]) {
        Configs.updateConfigViaApi({
          ...configs[0],
          value: JSON.stringify({ canUserEditOrderNumber }),
        });
      } else {
        const config = this.generateUserCanEditPONumberConfig(canUserEditOrderNumber);
        Configs.createConfigViaApi(config);
      }
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
