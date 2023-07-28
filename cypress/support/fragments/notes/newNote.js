import {
  Button,
  Callout,
  Modal,
  MultiColumnListRow,
  RichEditor,
  Section,
  Select,
  Spinner,
  TextField,
  including,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import topMenu from '../topMenu';

const newButton = Button('+ New');
const nameTextfield = TextField('Note type 0');
const saveButton = Button('Save');
const closeWithoutSave = Button('Close without saving');
const trashButton = Button({ icon: 'trash' });
const deleteNoteModal = Modal({
  id: 'delete-controlled-vocab-entry-confirmation',
});
const deleteButtonInNote = Button('Delete', {
  id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm',
});

export default class NewNote {
  static #titleTextField = TextField('Note title*');

  static #saveButton = Button('Save & close');

  static #defaultNote = {
    title: `autotest_title_${getRandomPostfix()}`,
    details: `autotest_details_${getRandomPostfix()}`,
    getShortDetails() {
      return this.details.substring(0, 255);
    },
  };

  static get defaultNote() {
    return this.#defaultNote;
  }

  static fill(specialNote = this.#defaultNote) {
    cy.do([
      this.#titleTextField.fillIn(specialNote.title),
      RichEditor('Details').fillIn(specialNote.details),
    ]);
  }

  static save() {
    cy.do(this.#saveButton.click());
  }

  static fillNote(name) {
    cy.do(newButton.click());
    cy.do(nameTextfield.fillIn(name));
    cy.do(saveButton.click());
  }

  static clickOnNoteType(selectedNote) {
    cy.expect(Spinner().absent());
    cy.do(Select('Note type').choose(selectedNote));
    cy.contains(selectedNote).should('exist');
  }

  static closeWithoutSaveButton() {
    cy.expect(closeWithoutSave.exists());
    cy.do(closeWithoutSave.click());
  }

  static deleteNote(name) {
    cy.visit(topMenu.notesPath);
    cy.do([
      Section({ id: 'controlled-vocab-pane' })
        .find(MultiColumnListRow({ content: including(name) }))
        .find(trashButton)
        .click(),
      deleteNoteModal.find(deleteButtonInNote).click(),
    ]);
    cy.expect(
      Callout({ type: 'success' }).has({
        text: including(`The note type ${name} was successfully deleted`),
      })
    );
  }
}
