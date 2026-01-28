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
import OrderStorageSettings from '../../orders/orderStorageSettings';
import InteractorsTools from '../../../utils/interactorsTools';

const ORDER_NUMBER_SETTING_KEY = 'orderNumber';
const INSTANCE_MATCHING_DESCRIPTION =
  'When active, instance matching will cause purchase order lines that are set to create instances, but are not manually linked to an instance record, to first search instances to find a match for one or more of the product IDs provided on the POL. If a product ID is found, that instance will be linked to the POL, and the system will NOT create a new instance for that POL. If no matches are found, the system will create a new instance record and link the POL to that instance.';
const editPoNumberCheckbox = Checkbox('User can edit');
const saveButton = Button('Save');
const trashIconButton = Button({ icon: 'trash' });
const deleteButton = Button('Delete');
const checkboxInstanceMatching = Checkbox({ name: 'isInstanceMatchingDisabled' });

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

  uncheckUsercanEditPONumberIfChecked: () => {
    cy.expect(editPoNumberCheckbox.exists());
    cy.do(editPoNumberCheckbox.uncheckIfSelected());
    cy.get('#clickable-save-config').then(($btn) => {
      if (!$btn.is(':disabled')) {
        cy.wrap($btn).click();
      }
    });
    cy.wait(2000);
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
      key: ORDER_NUMBER_SETTING_KEY,
      id: uuid(),
    };
  },

  getUserCanEditPONumberViaApi() {
    return OrderStorageSettings.getSettingsViaApi({ key: ORDER_NUMBER_SETTING_KEY });
  },

  setUserCanEditPONumberViaApi(canUserEditOrderNumber) {
    this.getUserCanEditPONumberViaApi().then((settings) => {
      if (settings[0]) {
        OrderStorageSettings.updateSettingViaApi({
          ...settings[0],
          value: JSON.stringify({ canUserEditOrderNumber }),
        });
      } else {
        const setting = this.generateUserCanEditPONumberConfig(canUserEditOrderNumber);
        OrderStorageSettings.createSettingViaApi(setting);
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

  switchDisableInstanceMatching() {
    cy.do([checkboxInstanceMatching.click(), saveButton.click()]);
  },

  checkSaveButtonIsDisabled() {
    cy.expect(saveButton.is({ disabled: true }));
  },

  verifyCheckboxIsSelected(checkbox, isChecked = false) {
    cy.expect(Checkbox({ name: checkbox }).has({ checked: isChecked }));
  },

  uncheckDisableInstanceMatchingIfChecked() {
    cy.expect(checkboxInstanceMatching.exists());
    cy.do(checkboxInstanceMatching.uncheckIfSelected());
    cy.get('#clickable-save-config').then((btn) => {
      if (btn && !btn.prop('disabled')) {
        cy.wrap(btn).click();
      }
    });
  },

  verifyInstanceMatchingDescription() {
    cy.contains(INSTANCE_MATCHING_DESCRIPTION).should('exist');
  },

  verifyOptionsAbsentInSettingsOrders(options) {
    options.forEach((option) => {
      cy.contains(option).should('not.exist');
    });
  },
};
