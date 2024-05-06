import {
  Button,
  HTML,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  TextField,
  including,
  Select,
  not,
} from '../../../../../interactors';
import ChangeInstanceModal from './changeInstanceModal';

const selectInstanceModal = Modal('Select instance');

const searchInput = selectInstanceModal.find(TextField({ name: 'query' }));
const searchButton = selectInstanceModal.find(Button('Search'));
const resetAllButton = selectInstanceModal.find(Button('Reset all'));
const closeButton = selectInstanceModal.find(Button('Close'));

const resultsList = selectInstanceModal.find(HTML({ id: 'list-plugin-find-records' }));

const searchOptionSelect = Select('Search field index');
const defaultSearchOptionValue = 'all';

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
  selectInstance({ shouldConfirm = false } = {}) {
    cy.do(selectInstanceModal.find(MultiColumnListRow({ index: 0 })).click());
    cy.expect(selectInstanceModal.absent());

    if (shouldConfirm) {
      ChangeInstanceModal.verifyModalView();
    }
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
  clickSearchOptionSelect() {
    cy.do(searchOptionSelect.click());
  },
  chooseSearchOption(searchOption) {
    cy.do(searchOptionSelect.choose(searchOption));
  },
  checkSearchOptionIncluded(searchOption, optionShown = true) {
    if (optionShown) cy.expect(searchOptionSelect.has({ content: including(searchOption) }));
    else cy.expect(searchOptionSelect.has({ content: not(including(searchOption)) }));
  },
  checkDefaultSearchOptionSelected() {
    cy.expect(searchOptionSelect.has({ value: defaultSearchOptionValue }));
  },
  checkSearchInputFieldValue(query) {
    cy.expect(searchInput.has({ value: query }));
  },
  checkResultsListEmpty() {
    cy.expect(resultsList.absent());
  },
};
