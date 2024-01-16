import {
  Button,
  HTML,
  Modal,
  MultiColumnListCell,
  TextField,
  including,
} from '../../../../../interactors';

const selectAgreementModal = Modal({ id: 'plugin-find-agreement-modal' });
const searchInput = selectAgreementModal.find(TextField({ id: 'input-agreement-search' }));
const searchButton = selectAgreementModal.find(Button('Search'));
const resetAllButton = selectAgreementModal.find(Button('Reset all'));

const resultsList = selectAgreementModal.find(HTML({ id: 'list-agreements' }));

export default {
  waitLoading() {
    cy.expect(selectAgreementModal.exists());
  },
  verifyModalView() {
    cy.expect([
      selectAgreementModal.has({ header: 'Select agreement' }),
      searchButton.has({ disabled: true, visible: true }),
      resetAllButton.has({ disabled: true, visible: true }),
    ]);
  },
  checkTableContent({ records = [] } = {}) {
    records.forEach((record, index) => {
      if (record.name) {
        cy.expect(
          resultsList
            .find(MultiColumnListCell({ row: index, column: 'Name' }))
            .has({ content: including(record.name) }),
        );
      }
    });

    if (!records.length) {
      cy.expect(
        selectAgreementModal
          .find(HTML({ className: including('noResultsMessage-') }))
          .has({ text: 'Choose a filter or enter a search query to show results.' }),
      );
    }
  },
  searchByName(agreementTitle) {
    cy.do([searchInput.fillIn(agreementTitle), searchButton.click()]);
    cy.expect(
      selectAgreementModal.find(HTML(including('Enter search criteria to start search'))).absent(),
    );
  },
  selectAgreement({ row = 0 } = {}) {
    cy.do(resultsList.find(MultiColumnListCell({ row, column: 'Name' })).click());
    cy.expect(selectAgreementModal.absent());
  },
  clickSearchButton() {
    cy.expect(searchButton.has({ disabled: false }));
    cy.do(searchButton.click());
  },
  clickResetAllButton() {
    cy.expect(resetAllButton.has({ disabled: false }));
    cy.do(resetAllButton.click());
  },
};
