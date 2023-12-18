import {
  Button,
  HTML,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  TextField,
  including,
} from '../../../../../interactors';

const selectInstanceModal = Modal('Select instance');

const searchInput = selectInstanceModal.find(TextField({ name: 'query' }));
const searchButton = selectInstanceModal.find(Button('Search'));
const resetAllButton = selectInstanceModal.find(Button('Reset all'));
const closeButton = selectInstanceModal.find(Button('Close'));

const resultsList = selectInstanceModal.find(HTML({ id: 'list-plugin-find-records' }));

export default {
  waitLoading() {
    cy.expect(selectInstanceModal.exists());
  },
  verifyModalView() {
    cy.expect([
      searchButton.has({ disabled: true, visible: true }),
      resetAllButton.has({ disabled: true, visible: true }),
      closeButton.has({ disabled: false, visible: true }),
    ]);

    this.checkTableContent();
  },
  checkTableContent({ records = [] } = {}) {
    records.forEach((record, index) => {
      if (record.title) {
        cy.expect(
          resultsList
            .find(MultiColumnListCell({ row: index, column: 'Title' }))
            .has({ content: including(record.title) }),
        );
      }
    });

    if (!records.length) {
      cy.expect(
        selectInstanceModal
          .find(HTML({ className: including('noResultsMessage-') }))
          .has({ text: 'Choose a filter or enter a search query to show results.' }),
      );
    }
  },
  searchByName(instanceTitle) {
    cy.do([searchInput.fillIn(instanceTitle), searchButton.click()]);
    cy.expect(
      selectInstanceModal.find(HTML(including('Enter search criteria to start search'))).absent(),
    );
  },
  selectInstance() {
    cy.do(selectInstanceModal.find(MultiColumnListRow({ index: 0 })).click());
    cy.expect(selectInstanceModal.absent());
  },
  clickSearchButton() {
    cy.expect(searchButton.has({ disabled: false }));
    cy.do(searchButton.click());
  },
  clickResetAllButton() {
    cy.expect(resetAllButton.has({ disabled: false }));
    cy.do(resetAllButton.click());
  },
  clickCloseButton() {
    cy.expect(closeButton.has({ disabled: false }));
    cy.do(closeButton.click());
    cy.expect(selectInstanceModal.absent());
  },
};
