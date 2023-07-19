import { RichEditor, TextField, Button } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const newButton = Button('+ New');
const nameTextfield = TextField('Note type 0');
const saveButton = Button('Save');
const notetype = "//select[contains(@class,'selectControl')]";
const closeWithoutSave = Button('Close without saving');


export default class NewNote {
  static #titleTextField = TextField('Note title*');


  static #saveButton = Button('Save & close');


  static #defaultNote = {
    title: `autotest_title_${getRandomPostfix()}`,
    details: `autotest_details_${getRandomPostfix()}`,
    getShortDetails() { return this.details.substring(0, 255); }
  }

  static get defaultNote() {
    return this.#defaultNote;
  }


  static fill(specialNote = this.#defaultNote) {
    cy.do([this.#titleTextField.fillIn(specialNote.title),
      RichEditor('Details').fillIn(specialNote.details)]);
  }

  static save() {
    cy.do(this.#saveButton.click());
  }

  static clickOnNew(name) {
    cy.do(newButton.click());
    cy.do(nameTextfield.fillIn(name));
    cy.do(saveButton.click());
  }

  static clickOnNoteType(selectedNote) {
    cy.wait(2000);
    cy.do([cy.xpath(notetype).select(selectedNote)]);
    cy.contains(selectedNote).should('exist');
  }

  static closeWithoutSaveButton() {
    cy.do(closeWithoutSave.click());
  }
}
