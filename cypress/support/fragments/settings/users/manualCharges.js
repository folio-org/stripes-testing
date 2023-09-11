import getRandomPostfix from '../../../utils/stringTools';
import {
  Select,
  Button,
  TextField,
  MultiColumnListCell,
  Section,
  PaneHeader,
} from '../../../../../interactors';

const rootSection = Section({ id: 'controlled-vocab-pane' });

const defaultFeeFineType = {
  // required field
  ownerId: undefined,
  // required field
  // id: undefined,
  feeFineType: `testFeeFineType${getRandomPostfix()}`,
  defaultAmount: 100.0,
  automatic: false,
};

export default {
  defaultFeeFineType,
  waitLoading: () => cy.expect(rootSection.find(PaneHeader('Fee/fine: Manual charges')).exists()),
  createViaApi: (ownerIdfeeFineTypeProperties) => cy
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
    })),
  deleteViaApi: (manualChargeId) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `feefines/${manualChargeId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  fillInFields(data, index = 0) {
    cy.do([
      TextField({ name: `items[${index}].feeFineType` }).fillIn(data.feeFineType),
      TextField({ name: `items[${index}].defaultAmount` }).fillIn(data.defaultAmount),
      Select({ name: `items[${index}].actionNoticeId` }).choose(data.actionNoticeId),
      Select({ name: `items[${index}].chargeNoticeId` }).choose(data.chargeNoticeId),

      Button({ id: `clickable-save-settings-feefines-${index}` }).click(),
    ]);
  },
  createViaUi(data) {
    cy.do(Select({ id: 'select-owner' }).choose(data.feeFineOwnerName));
    cy.do(Button({ id: 'clickable-add-settings-feefines' }).click());
    this.fillInFields(data);
  },
  checkManualCharge(data) {
    cy.expect([
      MultiColumnListCell({ content: data.feeFineType }).exists(),
      MultiColumnListCell({ content: data.defaultAmount }).exists(),
      MultiColumnListCell({ content: data.chargeNoticeId }).exists(),
      MultiColumnListCell({ content: data.actionNoticeId }).exists(),
    ]);
  },
};
