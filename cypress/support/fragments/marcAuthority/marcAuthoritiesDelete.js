import { Button, PaneHeader, DropdownMenu, Heading, Modal, HTML, PaneContent, Callout } from '../../../../interactors';

const actionsButton = PaneHeader({ id: 'paneHeadermarc-view-pane' }).find(Button('Actions'));
const deleteButton = DropdownMenu().find(Button('Delete'));
const deleteConfirmModal = Modal({ id: 'confirm-delete-note' });
const confirmDeleteButton = deleteConfirmModal.find(Button('Delete'));
const searchResults = PaneContent({ id: 'authority-search-results-pane-content' });

export default {
  clickDeleteButton() {
    cy.do([
      actionsButton.click(),
      deleteButton.click(),
    ]);
  },
  checkDeleteModal() {
    cy.expect([
      Heading({ id: 'confirm-delete-note-label' }).exists(),
      deleteConfirmModal.find(Button('Cancel')).exists(),
      confirmDeleteButton.exists(),
    ]);
  },
  confirmDelete() {
    cy.do(confirmDeleteButton.click());
  },
  checkDelete(headingReference) {
    cy.expect(Callout().find(HTML(`MARC authority record ${headingReference} has been deleted`)).exists());
  },
  checkEmptySearchResults(headingReference) {
    cy.expect(searchResults.find(HTML(`No results found for "${headingReference}". Please check your spelling and filters.`)).exists());
  },
};
