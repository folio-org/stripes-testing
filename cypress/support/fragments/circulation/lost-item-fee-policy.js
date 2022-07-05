import uuid from 'uuid';
import { getTestEntityValue } from '../../utils/stringTools';
import { PaneHeader, Button, TextField, Select, KeyValue, Section, HTML } from '../../../../interactors';

const actionsButton = Button('Actions');
const lostItemFeePolicySection = Section({ id: 'viewLostItemFeeSection' });
const lostItemFeeGeneralInformationSection = Section({ id: 'LostItemFeeGeneralInformation' });

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
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-edit-item' }).click(),
    ]);
  },

  fillName(name) {
    // waiting for form to be able to recieve text
    cy.wait(1000);
    cy.do(TextField('Lost item fee policy name*').fillIn(name));
  },

  fillDuration(duration, interval) {
    cy.do([
      TextField({ name: 'lostItemChargeFeeFine.duration' }).fillIn(duration),
      Select({ name: 'lostItemChargeFeeFine.intervalId' }).choose(interval),
    ]);
  },

  save() {
    cy.do(Button({ id: 'footer-save-entity' }).click());
  },

  checkErrorMessage() {
    cy.expect(HTML('Required if there is a possibility of no fee/fine being charged for a lost item').exists());
  },

  checkAfterSaving(name, duration) {
    cy.expect([
      lostItemFeeGeneralInformationSection.find(KeyValue({ value: name })).exists(),
      lostItemFeePolicySection.find(KeyValue({ value: duration })).exists(),
    ]);
  },

  delete() {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  },

  createApiSpecific(lostItemFeePolicy) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'lost-item-fees-policies',
        body: lostItemFeePolicy,
      })
      .then(({ body }) => {
        return body;
      });
  },

  createApi() {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'lost-item-fees-policies',
        body: defaultLostItemFeePolicy,
      })
      .then(({ body }) => {
        Cypress.env('lostItemFeePolicy', body);
        return body;
      });
  },
  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `lost-item-fees-policies/${id}`,
    });
  },
};
