import uuid from 'uuid';

import {
  Button,
  MultiColumnListRow,
  Pane,
  PaneSet,
  TextField,
  including,
} from '../../../../../interactors';
import ConfirmDelete from './modals/confirmDelete';
import { REQUEST_METHOD } from '../../../constants';
import getRandomPostfix from '../../../utils/stringTools';

const noteTypeRootPane = Pane({ id: 'controlled-vocab-pane' });
const newNoteTypeButton = Button({ id: 'clickable-add-noteTypes', disabled: false });
const cancelNoteTypeCreationButton = Button({ id: including('clickable-cancel-noteTypes-') });
const saveNoteTypeButton = Button({ id: including('clickable-save-noteTypes-') });
const editIcon = Button({ id: including('clickable-edit-noteTypes-') });
const deleteIcon = Button({ id: including('clickable-delete-noteTypes-') });
const noteTypeInput = TextField();
const noteTypePane = PaneSet({ id: 'noteTypes' });
const rowWithText = (noteType) => MultiColumnListRow({ content: including(noteType) });
const newButton = Button({ id: 'clickable-add-noteTypes' });

export default {
  createNoteTypeViaApi({
    id = uuid(),
    name = `autotest_note_type_name_${getRandomPostfix()}`,
  } = {}) {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'note-types',
        body: {
          id,
          name,
        },
      })
      .then(({ body }) => body);
  },

  deleteNoteTypeViaApi(noteTypeId) {
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

  checkNoteTypeButtonsStates({
    name,
    addNewButton = { disabled: false },
    editButton = { present: true },
    deleteButton = { present: true },
  } = {}) {
    this.checkNoteTypeIsDisplayed(name);

    if (!addNewButton.disabled) {
      cy.expect(noteTypeRootPane.find(Button({ text: '+ New', disabled: false })).exists());
    } else {
      cy.expect(noteTypeRootPane.find(Button({ text: '+ New', disabled: true })).exists());
    }

    if (editButton.present) {
      cy.expect(rowWithText(name).find(editIcon).exists());
    } else {
      cy.expect(rowWithText(name).find(editIcon).absent());
    }

    if (deleteButton.present) {
      cy.expect(rowWithText(name).find(deleteIcon).exists());
    } else {
      cy.expect(rowWithText(name).find(deleteIcon).absent());
    }
  },
  checkNoteButtonsState: () => {
    cy.expect([
      cancelNoteTypeCreationButton.exists(),
      saveNoteTypeButton.has({ disabled: true }),
      noteTypeInput.exists(),
    ]);
  },

  fillInNoteType: (noteTypeName) => {
    cy.do([noteTypeInput.focus(), noteTypeInput.fillIn(noteTypeName)]);
    cy.expect(saveNoteTypeButton.has({ disabled: false }));
  },

  saveNoteType(noteType) {
    cy.do(saveNoteTypeButton.click());
    // need to wait for note type to appear after creation
    cy.wait(3000);
    this.checkNoteTypeIsDisplayed(noteType);
  },

  deleteNoteType(noteType) {
    this.clickDeleteNoteType(noteType);
    ConfirmDelete.verifyDeleteMessage(noteType);
    ConfirmDelete.verifyCancelButtonDisplayed();
    ConfirmDelete.verifyDeleteButtonDisplayed();
    ConfirmDelete.confirmDelete();
  },

  clickEditNoteType: (noteType) => {
    cy.expect(rowWithText(noteType).exists());
    cy.do(rowWithText(noteType).find(editIcon).click());
  },

  clickDeleteNoteType: (noteType) => cy.do(rowWithText(noteType).find(deleteIcon).click()),

  checkNewNoteButtonEnabled: () => cy.expect(newNoteTypeButton.exists()),

  checkNoteTypeIsDisplayed: (noteType) => cy.expect(rowWithText(noteType).exists()),
  checkNoteTypeIsNotDisplayed: (noteType) => cy.expect(rowWithText(noteType).absent()),

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

  checkNewButtonState(isEnabled = true) {
    cy.expect(newButton.has({ disabled: !isEnabled }));
  },

  getNoteTypeIdViaAPI(noteTypeName) {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.GET,
        path: `note-types?query=(name="${noteTypeName}")`,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body.noteTypes[0].id);
  },
};
