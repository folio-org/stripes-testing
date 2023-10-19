import uuid from 'uuid';
import { including } from '@interactors/html';
import ConfirmDelete from './modals/confirmDelete';
import { REQUEST_METHOD } from '../../../constants';
import { Button, MultiColumnListRow, PaneSet, TextField } from '../../../../../interactors';

const newNoteTypeButton = Button({ id: 'clickable-add-noteTypes', disabled: false });
const cancelNoteTypeCreationButton = Button({ id: 'clickable-cancel-noteTypes-0' });
const saveNoteTypeButton = Button({ id: 'clickable-save-noteTypes-0' });
const editIcon = Button({ id: including('clickable-edit-noteTypes-') });
const deleteIcon = Button({ id: including('clickable-delete-noteTypes-') });
const noteTypeInput = TextField();
const noteTypePane = PaneSet({ id: 'noteTypes' });
const rowWithText = (noteType) => MultiColumnListRow({ content: including(noteType) });

export default {
  createNoteTypeViaApi: (noteTypeName) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'note-types',
        body: {
          id: uuid(),
          name: noteTypeName,
        },
      })
      .then((response) => response.body);
  },

  deleteNoteTypeViaApi: (noteTypeId) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `note-types/${noteTypeId}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  waitLoading: () => {
    cy.expect(noteTypePane.exists());
  },

  addNoteType() {
    cy.do(newNoteTypeButton.click());
    this.checkNoteButtonsState();
  },

  checkNoteButtonsState: () => {
    cy.expect([
      cancelNoteTypeCreationButton.exists(),
      saveNoteTypeButton.has({ disabled: true }),
      noteTypeInput.exists(),
    ]);
  },

  fillInNoteType: (noteTypeName) => {
    cy.do(noteTypeInput.fillIn(noteTypeName));
    cy.expect(saveNoteTypeButton.has({ disabled: false }));
  },

  saveNoteType(noteType) {
    cy.do(saveNoteTypeButton.click());
    // need to wait for note type to appear after creation
    cy.wait(2000);
    this.checkNoteTypeIsDisplayed(noteType);
  },

  deleteNoteType(noteType) {
    this.clickDeleteNoteType(noteType);
    ConfirmDelete.verifyDeleteMessage(noteType);
    ConfirmDelete.confirmDelete();
  },

  clickEditNoteType: (noteType) => cy.do(rowWithText(noteType).find(editIcon).click()),

  clickDeleteNoteType: (noteType) => cy.do(rowWithText(noteType).find(deleteIcon).click()),

  checkNewNoteButtonEnabled: () => cy.expect(newNoteTypeButton.exists()),

  checkNoteTypeIsDisplayed: (noteType) => cy.expect(rowWithText(noteType).exists()),

  checkEditAndDeleteIcons: (noteType) => {
    cy.expect([
      rowWithText(noteType).find(editIcon).exists(),
      rowWithText(noteType).find(deleteIcon).exists(),
    ]);
  },

  checkDeleteIconNotDisplayed: (noteType) => {
    cy.expect([
      rowWithText(noteType).find(editIcon).exists(),
      rowWithText(noteType).find(deleteIcon).absent(),
    ]);
  },
};
