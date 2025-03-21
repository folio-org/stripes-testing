import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Callout,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  Pane,
  Section,
  Selection,
  TextField,
} from '../../../../../interactors';

const selectLocationModal = Modal({ header: 'Select locations' });
const updateOwnershipOfHoldingsModal = Modal('Update ownership of holdings');
const searchFilterPane = selectLocationModal.find(Pane('Search & filter'));
const cancelButton = updateOwnershipOfHoldingsModal.find(Button('Cancel'));
const confirmButton = updateOwnershipOfHoldingsModal.find(Button('Confirm'));

export default {
  search(name) {
    cy.do([
      searchFilterPane.find(TextField({ id: 'input-record-search' })).fillIn(name),
      searchFilterPane.find(Button('Search')).click(),
    ]);
    cy.wait(1500);
  },

  selectLocation(action, holdingsHrid, firstMember, secondMember, locationName) {
    this.search(locationName);
    cy.do(
      selectLocationModal
        .find(MultiColumnList({ id: 'list-plugin-find-records' }))
        .find(MultiColumnListRow({ index: 0 }))
        .click(),
    );
    cy.expect(selectLocationModal.absent());
    this.validateUpdateOwnershipOfHoldings(holdingsHrid, firstMember, secondMember);

    if (action === 'cancel') {
      cy.do(cancelButton.click());
      cy.expect([
        updateOwnershipOfHoldingsModal.absent(),
        Section({ id: 'view-holdings-record-pane' }).exists(),
      ]);
    } else if (action === 'confirm') {
      cy.do(confirmButton.click());
      cy.expect(
        Callout({
          textContent: `Ownership of Holdings ${holdingsHrid} and all linked Items has been successfully updated to ${secondMember}`,
        }).exists(),
      );
      cy.expect(updateOwnershipOfHoldingsModal.absent());
    }
  },
  close() {
    cy.do(selectLocationModal.find(Button({ icon: 'times' })).click());
    cy.expect(selectLocationModal.absent());
  },

  validateSelectLocationModalView(tenant) {
    cy.expect([
      selectLocationModal.exists(),
      searchFilterPane.find(Selection('Affiliation')).has({ singleValue: tenant }),
      searchFilterPane.find(Accordion('Institution')).exists(),
      searchFilterPane.find(Accordion('Campus')).exists(),
      searchFilterPane.find(Accordion('Library')).exists(),
      selectLocationModal.find(Button({ icon: 'times' })).exists(),
      selectLocationModal.find(Pane('Locations')).exists(),
      selectLocationModal.find(Pane('Locations')).find(Button('Actions')).exists(),
    ]);
  },
  validateUpdateOwnershipOfHoldings(holdingsHrid, firstMember, secondMember) {
    cy.expect([
      updateOwnershipOfHoldingsModal.exists(),
      updateOwnershipOfHoldingsModal.has({
        message: including(
          `Would you like to update ownership of Holdings ${holdingsHrid} from ${firstMember} to ${secondMember}? Please note that updating Holdings ownership will also migrate all linked Items.`,
        ),
      }),
      cancelButton.exists(),
      confirmButton.exists(),
    ]);
  },
  validateSelectLocationModalExists() {
    cy.expect(selectLocationModal.exists());
  },
};
