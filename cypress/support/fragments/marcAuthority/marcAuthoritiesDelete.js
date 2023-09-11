import {
  MultiColumnListCell,
  including,
  Button,
  PaneHeader,
  DropdownMenu,
  Heading,
  Section,
  Modal,
  HTML,
  PaneContent,
  Callout,
} from '../../../../interactors';

const actionsButton = PaneHeader({ id: 'paneHeadermarc-view-pane' }).find(Button('Actions'));
const deleteButton = DropdownMenu().find(Button('Delete'));
const printButton = DropdownMenu().find(Button('Print'));
const deleteConfirmModal = Modal({ id: 'confirm-delete-note' });
const deleteConfirmModalHeader = Heading({ id: 'confirm-delete-note-label' });
const confirmDeleteButton = deleteConfirmModal.find(Button('Delete'));
const confirmCancelButton = deleteConfirmModal.find(Button('Cancel'));
const searchResults = PaneContent({ id: 'authority-search-results-pane-content' });
const searchResultPane = Section({ id: 'marc-view-pane' });

export default {
  clickDeleteButton() {
    cy.do([actionsButton.click(), deleteButton.click()]);
  },

  checkDeleteModal() {
    cy.expect([
      deleteConfirmModalHeader.exists(),
      confirmCancelButton.exists(),
      confirmDeleteButton.exists(),
    ]);
  },
  clickprintButton() {
    cy.do([actionsButton.click(), printButton.click()]);
  },

  checkDeleteModalMessage(message) {
    cy.expect(deleteConfirmModal.has({ message }));
  },

  clickCancelButton() {
    cy.do(confirmCancelButton.click());
    cy.expect([deleteConfirmModal.absent(), actionsButton.exists()]);
  },

  confirmDelete() {
    cy.do(confirmDeleteButton.click());
  },

  checkAfterDeletion(record) {
    cy.expect([
      deleteConfirmModal.absent(),
      Callout()
        .find(HTML(`MARC authority record ${record} has been deleted`))
        .exists(),
      searchResultPane.absent(),
      MultiColumnListCell({ content: record }).absent(),
      // eslint-disable-next-line no-irregular-whitespace
      MultiColumnListCell(including(`${record} would be here`)).exists(),
    ]);
  },

  checkDelete(headingReference) {
    cy.expect(
      Callout()
        .find(HTML(`MARC authority record ${headingReference} has been deleted`))
        .exists(),
    );
  },

  checkEmptySearchResults(headingReference) {
    cy.expect(
      searchResults
        .find(
          HTML(
            `No results found for "${headingReference}". Please check your spelling and filters.`,
          ),
        )
        .exists(),
    );
  },
};
