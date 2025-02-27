import { HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  Pane,
  Section,
  SelectionList,
  SelectionOption,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const selectLocationModal = Modal({ header: 'Select locations' });
const updateOwnershipOfHoldingsModal = Modal('Update ownership of holdings');
const searchFilterPane = selectLocationModal.find(Pane('Search & filter'));
const selectLocationCancelButton = selectLocationModal.find(Button('Cancel'));
const selectLocationConfirmButton = selectLocationModal.find(Button('Confirm'));
const updateOwnershipOfHoldingsCancelButton = updateOwnershipOfHoldingsModal.find(Button('Cancel'));
const updateOwnershipOfHoldingsConfirmButton = updateOwnershipOfHoldingsModal.find(
  Button('Confirm'),
);

export default {
  validateSelectLocationModalView(tenant) {
    cy.expect([
      selectLocationModal.exists(),
      searchFilterPane
        .find(SelectionList({}))
        .find(SelectionOption(including(tenant))) // University tenant
        .exists(),
      searchFilterPane.find(Accordion('Institution')).exists(),
      searchFilterPane.find(Accordion('Campus')).exists(),
      searchFilterPane.find(Accordion('Library')).exists(),
      searchFilterPane.find(Button('X')).exists(),
      selectLocationModal.find(Pane('Locations')).exists(),
    ]);
  },
  validateUpdateOwnershipOfHoldings(holdingsHrid, firstMember, secondMember) {
    cy.expect([
      updateOwnershipOfHoldingsModal.exists(),
      updateOwnershipOfHoldingsModal.find(
        HTML(
          including(
            `Would you like to update ownership of Holdings ${holdingsHrid} from ${firstMember} to ${secondMember}? Please note that updating Holdings ownership will also migrate all linked Items.`,
          ),
        ),
      ),
      updateOwnershipOfHoldingsCancelButton.exists(),
      updateOwnershipOfHoldingsConfirmButton.exists(),
    ]);
  },

  selectLocation(action, holdingsHrid, firstMember, secondMember) {
    cy.do(
      selectLocationModal
        .find(MultiColumnList({ id: 'list-plugin-find-records' }))
        .find(MultiColumnListRow({ row: 0 }))
        .click(),
    );
    this.validateUpdateOwnershipOfHoldings(holdingsHrid, firstMember, secondMember);

    if (action === 'cancel') {
      cy.do(selectLocationCancelButton.click());
      cy.expect([
        selectLocationModal.absent(),
        updateOwnershipOfHoldingsModal.absent(),
        Section({ id: 'view-holdings-record-pane' }).exists(),
      ]);
    } else if (action === 'confirm') {
      cy.do(selectLocationConfirmButton.click());
      cy.expect(selectLocationModal.absent());
      InteractorsTools.checkCalloutMessage(
        `Ownership of Holdings ${holdingsHrid} and all linked Items has been successfully updated to ${secondMember} tenant`,
      );
    }
  },
};
