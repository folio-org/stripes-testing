import {
  Button, Checkbox,
  including,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  TextField
} from '../../../../../interactors';

const assignUnassignModal = Modal('Assign / Unassign note');
const searchField = TextField('Note search');
const searchButton = Button('Search');
const notesList = MultiColumnList({ id: 'notes-modal-notes-list' });
const assignNoteCheckbox = Checkbox({ className: including('notes-assign-checkbox') });
const cancelButton = Button('Cancel');
const saveButton = Button('Save');

export default {
  verifyModalIsShown() {
    cy.expect(assignUnassignModal.exists());
  },

  searchForNote(noteTitle) {
    cy.do([
      searchField.fillIn(noteTitle),
      searchButton.click(),
    ]);
  },

  verifyDesiredNoteIsShown(noteTitle) {
    cy.expect(notesList.exists());
    cy.do([
      notesList.find(MultiColumnListRow({ content: including(noteTitle), isContainer: true })).exists()
    ]);
  },

  selectCheckboxForNote(noteTitle) {
    cy.expect(notesList.exists());
    cy.do([
      notesList
        .find(MultiColumnListRow({ content: including(noteTitle), isContainer: true }))
        .find(assignNoteCheckbox)
        .click()
    ]);
  },

  clickCancelButton() {
    cy.expect((cancelButton).exists());
    cy.do(cancelButton.click());
  },

  clickSaveButton() {
    cy.expect((saveButton).exists());
    cy.do(saveButton.click());
  },
};
