import {
  Button,
  Checkbox,
  including,
  Modal,
  MultiColumnList,
  MultiColumnListHeader,
  MultiColumnListRow,
  TextField,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
} from '../../../../../interactors';

const assignUnassignModal = Modal('Assign / Unassign note');
const searchField = TextField('Note search');
const searchButton = Button('Search');
const notesList = MultiColumnList({ id: 'notes-modal-notes-list' });
const assignNoteCheckbox = Checkbox({ className: including('notes-assign-checkbox') });
const cancelButton = Button('Cancel');
const saveButton = Button('Save');
const asignedCheckbox = Checkbox('Assigned');
const noteTypeMultiSelect = MultiSelect({ ariaLabelledby: 'noteTypeSelect-label' });

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

  verifyNoteCheckboxDisabled(noteTitle) {
    cy.expect(notesList.exists());
    cy.expect(
      notesList
        .find(MultiColumnListRow({ content: including(noteTitle), isContainer: true }))
        .find(assignNoteCheckbox)
        .has({ disabled: true }),
    );
  },

  selectNoteType(noteTypeName) {
    cy.do([
      noteTypeMultiSelect.open(),
      MultiSelectMenu().find(MultiSelectOption(noteTypeName)).click(),
    ]);
    cy.wait(500);
  },

  clickTitleColumnHeader() {
    cy.do(notesList.find(MultiColumnListHeader('Title')).click());
    cy.wait(500);
  },

  verifyNotesSortedByTitle(sortOrder) {
    cy.expect(notesList.find(MultiColumnListHeader('Title')).has({ sort: sortOrder }));
  },

  verifyColumnIsNotSortable(columnName) {
    cy.expect(notesList.find(MultiColumnListHeader(columnName)).has({ sortable: false }));
  },

  clickColumnHeader(columnName) {
    cy.do(notesList.find(MultiColumnListHeader(columnName)).clickElement());
    cy.wait(500);
  },
};
