import {
  Section,
  including,
  Button,
  MultiColumnListCell,
  TextField,
  RichEditor,
  HTML,
} from '../../../../interactors';

const notesSection = Section({ id: 'providerShowNotes' });
const createButton = Button({ id: 'note-create-button' });
const titleField = TextField('Note title*');
const detailsField = RichEditor('Details');
const submitButton = Button({ type: 'submit' });
const actionsButton = Button('Actions');
const deleteButton = Button('Delete');
const editButton = Button('Edit');
const deleteButtonInConfirmation = Button({ id: 'clickable-confirm-delete-note-confirm' });
const sortByTitleButton = Button({ id: 'clickable-list-column-titleanddetails' });

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
  verifyNoteTitle: (title) => cy.expect(notesSection.find(HTML(including(title))).exists()),
  openNoteView: (title) => cy.do(MultiColumnListCell(including(title)).click()),
  deleteNote: () => {
    cy.do([actionsButton.click(), deleteButton.click(), deleteButtonInConfirmation.click()]);
  },
  verifyNoteDeletion: (title, details) => cy.expect(MultiColumnListCell({ content: `Title: ${title}Details: ${details}Edit` }).absent()),
  verifyNoteVisibilityWithViewPermission: (title, details) => cy.expect(MultiColumnListCell({ content: `Title: ${title}Details: ${details}` }).exists()),
  verifyActionButtonVisibilityWithViewPermission: () => {
    cy.expect(actionsButton.absent());
  },
  verifyDefaultSort: (firstTitle, secondTitle, details) => {
    cy.expect([
      MultiColumnListCell({
        content: `Title: ${secondTitle}Details: ${details}Edit`,
        row: 0,
      }).exists(),
      MultiColumnListCell({
        content: `Title: ${firstTitle}Details: ${details}Edit`,
        row: 1,
      }).exists(),
    ]);
  },
  verifySortingByTitle: (firstTitle, secondTitle, details) => {
    cy.do([sortByTitleButton.click(), sortByTitleButton.click()]);
    cy.expect([
      MultiColumnListCell({
        content: `Title: ${firstTitle}Details: ${details}Edit`,
        row: 0,
      }).exists(),
      MultiColumnListCell({
        content: `Title: ${secondTitle}Details: ${details}Edit`,
        row: 1,
      }).exists(),
    ]);
  },
  editNote: (title, newTitle, newDetails) => {
    cy.do([
      MultiColumnListCell(including(title)).find(editButton).click(),
      titleField.fillIn(newTitle),
      detailsField.fillIn(newDetails),
      submitButton.click(),
    ]);
  },
};
