import { Section, including, Button, MultiColumnListCell, TextField, RichEditor } from '../../../../interactors';

const notesSection = Section({ id: 'providerShowNotes' });
const createButton = Button({ id: 'note-create-button' });
const titleField = TextField('Note title*');
const detailsField = RichEditor('Details');
const submitButton = Button({ type: 'submit' });
const actionsButton = Button('Actions');
const deleteButton = Button('Delete');
const editButton = Button('Edit');
const deleteButtonInConfirmation = Button({ id: 'clickable-confirm-delete-note-confirm' });

export default {
  waitLoading: () => cy.expect(notesSection.exists()),
  createNote: (title, details) => {
    cy.do([
      createButton.click(),
      titleField.fillIn(title),
      detailsField.fillIn(details),
      submitButton.click(),
    ]);
  },
  verifyNoteCreation: (title, details) => cy.expect(MultiColumnListCell({ content: `Title: ${title}Details: ${details}Edit` }).exists()),
  openNoteView: (title) => cy.do(MultiColumnListCell(including(title)).click()),
  deleteNote: () => {
    cy.do([
      actionsButton.click(),
      deleteButton.click(),
      deleteButtonInConfirmation.click(),
    ]);
  },
  verifyNoteDeletion: (title, details) => cy.expect(MultiColumnListCell({ content: `Title: ${title}Details: ${details}Edit` }).absent()),
  verifyNoteVisibilityWithViewPermission: (title, details) => cy.expect(MultiColumnListCell({ content: `Title: ${title}Details: ${details}` }).exists()),
  verifyActionButtonVisibilityWithViewPermission: () => {
    cy.do(actionsButton.click());
    cy.expect([
      createButton.absent(),
      editButton.absent(),
    ]);
  },
};
