import uuid from 'uuid';
import { getTestEntityValue } from '../../utils/stringTools';
import {
  PaneHeader,
  Button,
  TextField,
  Select,
  KeyValue,
  Section,
  HTML,
} from '../../../../interactors';

const actionsButton = Button('Actions');
const lostItemFeePolicySection = Section({ id: 'viewLostItemFeeSection' });
const lostItemFeeGeneralInformationSection = Section({ id: 'LostItemFeeGeneralInformation' });
const policyNameField = TextField('Lost item fee policy name*');
const durationTextfield = TextField({ name: 'lostItemChargeFeeFine.duration' });
const intervalSelect = Select({ name: 'lostItemChargeFeeFine.intervalId' });
const saveButton = Button({ id: 'footer-save-entity' });
const deleteButton = Button({ id: 'dropdown-clickable-delete-item' });
const confirmButton = Button({ id: 'clickable-delete-item-confirmation-confirm' });

export const defaultLostItemFeePolicy = {
  chargeAmountItem: {
    amount: '0.00',
    chargeType: 'anotherCost',
  },
  lostItemProcessingFee: '0.00',
  chargeAmountItemPatron: false,
  chargeAmountItemSystem: false,
  returnedLostItemProcessingFee: false,
  replacedLostItemProcessingFee: false,
  replacementProcessingFee: '0.00',
  replacementAllowed: false,
  lostItemReturned: 'Charge',
  name: getTestEntityValue(),
  description: 'description',
  lostItemChargeFeeFine: {
    duration: 1,
    intervalId: 'Days',
  },
  id: uuid(),
};

export default {
  waitLoading() {
    cy.expect(PaneHeader('Lost item fee policies').exists());
  },

  startAdding() {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
  },

  startEditing() {
    cy.do([actionsButton.click(), Button({ id: 'dropdown-clickable-edit-item' }).click()]);
  },

  fillName(name) {
    // waiting for form to be able to recieve text
    // TODO: ask frontend team for the reasongs
    cy.wait(1000);
    cy.do(policyNameField.fillIn(name));
  },

  fillDuration(duration, interval) {
    cy.do([durationTextfield.fillIn(duration), intervalSelect.choose(interval)]);
  },

  save() {
    cy.do(saveButton.click());
  },

  checkErrorMessage(errorText) {
    cy.expect(HTML(errorText).exists());
  },

  checkAfterSaving(name, duration) {
    cy.expect([
      lostItemFeeGeneralInformationSection.find(KeyValue({ value: name })).exists(),
      lostItemFeePolicySection.find(KeyValue({ value: duration })).exists(),
    ]);
  },

  delete() {
    cy.do([actionsButton.click(), deleteButton.click(), confirmButton.click()]);
  },

  createViaApi(policy = defaultLostItemFeePolicy) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'lost-item-fees-policies',
        body: policy,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body;
      });
  },
  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `lost-item-fees-policies/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
