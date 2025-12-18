import {
  Modal,
  MultiColumnListCell,
  MultiColumnListHeader,
  Button,
  HTML,
  including,
} from '../../../../interactors';

const rootModal = Modal('Select item');
const previousButton = Button('Previous');
const nextButton = Button('Next');

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
    // Wait for spinner to disappear if present
    cy.wait(1000);
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
    cy.get('body').type('{esc}');
    cy.expect(rootModal.absent());
  },

  verifyRecordsFoundText: (count) => {
    cy.expect(rootModal.find(HTML(including('List of items: choose one'))).exists());
    cy.expect(rootModal.find(HTML(including(`${count} Records found`))).exists());
  },

  verifyPaginationText: (expectedText) => {
    cy.get('[class^="modal---"]')
      .find('div[class^="mclPrevNextPageInfoContainer-"]')
      .invoke('text')
      .then((text) => text.trim().replace(/\s+/g, ' '))
      .should('eq', expectedText);
  },

  verifyPreviousButtonState: (isEnabled) => {
    if (isEnabled) {
      cy.expect(rootModal.find(previousButton).has({ disabled: false }));
    } else {
      cy.expect(rootModal.find(previousButton).has({ disabled: true }));
    }
  },

  verifyNextButtonState: (isEnabled) => {
    if (isEnabled) {
      cy.expect(rootModal.find(nextButton).has({ disabled: false }));
    } else {
      cy.expect(rootModal.find(nextButton).has({ disabled: true }));
    }
  },

  clickNextButton: (expectedPaginationText = null) => {
    cy.do(rootModal.find(nextButton).click());
    if (expectedPaginationText) {
      cy.get('[class^="modal---"]', { timeout: 10000 })
        .find('div[class^="mclPrevNextPageInfoContainer-"]')
        .should(($el) => {
          const text = $el.text().trim().replace(/\s+/g, ' ');
          expect(text).to.equal(expectedPaginationText);
        });
    } else {
      cy.wait(1000);
    }
  },

  clickPreviousButton: (expectedPaginationText = null) => {
    cy.do(rootModal.find(previousButton).click());
    if (expectedPaginationText) {
      cy.get('[class^="modal---"]', { timeout: 10000 })
        .find('div[class^="mclPrevNextPageInfoContainer-"]')
        .should(($el) => {
          const text = $el.text().trim().replace(/\s+/g, ' ');
          expect(text).to.equal(expectedPaginationText);
        });
    } else {
      cy.wait(1000);
    }
  },
};
