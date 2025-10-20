import {
  Select,
  TextField,
  MultiColumnListCell,
  RadioButton,
  Button,
  Modal,
  Section,
  Option,
  including,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import SettingsPane from '../settingsPane';

const defaultFeeFineType = {
  // required field
  ownerId: undefined,
  // required field
  // id: undefined,
  feeFineType: `testFeeFineType${getRandomPostfix()}`,
  defaultAmount: 100.0,
  automatic: false,
};
const getManualCharge = ({ owner, chargeNoticeId, actionNoticeId }) => ({
  name: owner.owner,
  id: owner.id,
  feeFineType: `Manual_charge-${getRandomPostfix()}`,
  amount: '10.00',
  chargeNoticeId,
  actionNoticeId,
});

const ownerSelect = Select({ id: 'select-owner' });

export default {
  ...SettingsPane,
  defaultFeeFineType,
  getManualCharge,
  waitLoading() {
    SettingsPane.waitLoading('Fee/fine: Manual charges');
  },
  createViaApi(ownerIdfeeFineTypeProperties) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'feefines',
        isDefaultSearchParamsRequired: false,
        body: ownerIdfeeFineTypeProperties,
      })
      .then((response) => ({
        id: response.body.id,
        feeFineType: response.body.feeFineType,
        amount: response.body.defaultAmount,
      }));
  },
  deleteViaApi(manualChargeId) {
    return SettingsPane.deleteViaApi({ path: `feefines/${manualChargeId}` });
  },
  selectOwner({ owner, id }) {
    cy.do(ownerSelect.choose(owner));
    cy.expect(ownerSelect.has({ value: id }));
    // wait required to prevent "+ New" button disabling
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300);
  },
  selectOwnerByName(owner) {
    cy.do(ownerSelect.choose(owner));
  },
  checkSelectedOwner(owner) {
    cy.expect(ownerSelect.has({ checkedOptionText: owner }));
  },
  checkOwnersDropdownIncludesOption(owner) {
    cy.expect(ownerSelect.find(Option(owner)).exists());
  },
  fillInFields(data, index = 0) {
    cy.do([
      TextField({ name: `items[${index}].feeFineType` }).fillIn(data.feeFineType),
      TextField({ name: `items[${index}].defaultAmount` }).fillIn(data.amount),
      Select({ name: `items[${index}].chargeNoticeId` }).choose(data.chargeNoticeId || ''),
      Select({ name: `items[${index}].actionNoticeId` }).choose(data.actionNoticeId || ''),
    ]);
    SettingsPane.clickSaveBtn(index);
  },
  createViaUi(manualCharge) {
    cy.wait(500);
    SettingsPane.clickAddNewBtn();
    cy.wait(2000);
    cy.get('body').then(($body) => {
      if ($body.find('[class^=modal---]').length > 0) {
        cy.do(Modal().find(Button('Cancel')).click());
        cy.wait(1000);
        SettingsPane.clickAddNewBtn();
      } else {
        cy.log("Modal didn't appear");
      }
    });

    this.fillInFields(manualCharge);
  },
  editViaUi(manualCharge, newManualCharge) {
    SettingsPane.editViaUi(manualCharge.feeFineType);
    this.fillInFields(newManualCharge);
  },
  deleteViaUi(manualCharge) {
    SettingsPane.deleteViaUi({
      record: manualCharge.feeFineType,
      modalHeader: 'Delete Fee/fine type',
    });
  },
  checkValidatorError({ error }) {
    SettingsPane.checkValidatorError({ placeholder: 'feeFineType', error });
  },
  checkResultsTableContent(records = []) {
    SettingsPane.checkResultsTableContent(
      records.map(({ feeFineType: name, amount: code }) => ({ name, code })),
    );
  },
  checkDefaultEditButtonIsDisabled() {
    cy.expect(
      Section({ id: 'controlled-vocab-pane' })
        .find(Button({ id: 'charge-notice-primary' }))
        .absent(),
    );
  },
  checkManualCharge({ feeFineType, amount, chargeNoticeId = '', actionNoticeId = '' }) {
    cy.expect([
      MultiColumnListCell({ content: feeFineType }).exists(),
      MultiColumnListCell({ content: including(amount) }).exists(),
      MultiColumnListCell({ content: chargeNoticeId }).exists(),
      MultiColumnListCell({ content: actionNoticeId }).exists(),
    ]);
  },
  copyExistingFeeFineDialog(radioAction, ownerId, buttonAction) {
    const modal = Modal('Copy existing fee/fine owner table entries?');
    cy.expect([
      modal.exists(),
      modal.find(Select({ name: 'ownerId' })).exists(),
      modal.find(RadioButton('Yes')).exists(),
      modal.find(RadioButton('No')).exists(),
      modal.find(Button('Continue')).exists(),
      modal.find(Button('Cancel')).exists(),
    ]);
    cy.do([
      modal.find(RadioButton(radioAction)).click(),
      modal.find(Select({ name: 'ownerId' })).choose(ownerId),
      modal.find(Button(buttonAction)).click(),
    ]);
  },

  addDefaultChargeNoticeToOwner(noticeName) {
    cy.do(Button({ id: 'charge-notice-primary' }).click());
    cy.wait(1000);
    cy.do(Select({ id: 'defaultChargeNotice' }).choose(noticeName));
    cy.do(Button('Save').click());
    cy.wait(1000);
  },
};
