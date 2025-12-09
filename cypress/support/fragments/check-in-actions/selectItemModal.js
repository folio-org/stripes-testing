import { Modal, MultiColumnListCell, MultiColumnListHeader, Button } from '../../../../interactors';

const rootModal = Modal('Select item');

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  verifyModalTitle: () => {
    cy.expect(rootModal.has({ header: 'Select item' }));
  },

  chooseItem: (barcode) => {
    cy.do(rootModal.find(MultiColumnListCell(barcode)).click());
  },

  verifyCallNumberColumn: () => {
    cy.expect(rootModal.find(MultiColumnListHeader('Call number')).exists());
  },

  verifyCallNumberValue: (barcode, expectedValue = '-') => {
    cy.then(() => rootModal.find(MultiColumnListHeader('Call number')).index()).then(
      (columnIndex) => {
        cy.get('[class*="mclRowContainer"]')
          .contains(barcode)
          .parents('[class*="mclRow"]')
          .first()
          .find(`[class*="mclCell"]:eq(${columnIndex})`)
          .should('contain', expectedValue);
      },
    );
  },

  closeModal: () => {
    cy.do(rootModal.find(Button('Close')).click());
  },
};
