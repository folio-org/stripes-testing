import {
  Button,
  Checkbox,
  including,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  TextField,
} from '../../../../../interactors';

const assignUnassignModal = Modal('Assign / Unassign note');
const searchField = TextField('Note search');
const searchButton = Button('Search');
const notesList = MultiColumnList({ id: 'notes-modal-notes-list' });
const assignNoteCheckbox = Checkbox({ className: including('notes-assign-checkbox') });
const cancelButton = Button('Cancel');
const saveButton = Button('Save');
const asignedCheckbox = Checkbox('Assigned');

export default {
  verifyModalIsShown() {
    cy.expect(assignUnassignModal.exists());
  },

  searchForNote(noteTitle) {
    cy.do([searchField.fillIn(noteTitle), searchButton.click()]);
  },

  verifyDesiredNoteIsShown(noteTitle) {
    cy.expect(notesList.exists());
    cy.do([
      notesList
        .find(MultiColumnListRow({ content: including(noteTitle), isContainer: true }))
        .exists(),
    ]);
  },

  clickCheckboxForNote(noteTitle) {
    cy.expect(notesList.exists());
    cy.do([
      notesList
        .find(MultiColumnListRow({ content: including(noteTitle), isContainer: true }))
        .find(assignNoteCheckbox)
        .click(),
    ]);
  },

  verifyNoteCheckbox(noteTitle, isChecked = false) {
    cy.expect(notesList.exists());
    if (isChecked) {
      cy.expect(
        notesList
          .find(MultiColumnListRow({ content: including(noteTitle), isContainer: true }))
          .find(assignNoteCheckbox)
          .has({ checked: true }),
      );
    } else {
      cy.expect(
        notesList
          .find(MultiColumnListRow({ content: including(noteTitle), isContainer: true }))
          .find(assignNoteCheckbox)
          .has({ checked: false }),
      );
    }
  },

  clickCancelButton() {
    cy.expect(cancelButton.exists());
    cy.do(cancelButton.click());
  },

  clickSaveButton() {
    cy.expect(saveButton.exists());
    cy.do(saveButton.click());
  },

  selectAssignedNoteStatusCheckbox() {
    cy.do(asignedCheckbox.checkIfNotSelected());
    cy.expect(asignedCheckbox.has({ checked: true }));
  },
};
