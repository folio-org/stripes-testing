import { RichEditor, TextField, Button } from '../../../../interactors';
import getRandomPostfix from '../../../plugins/stringTools';

export default class NewNote {
  static #titleTextField = TextField('Note title*');


  static #saveButton = Button('Save & close');

  static #defaultNote = {
    title: `autotest_title_${getRandomPostfix()}`,
    details: `autotest_details_${getRandomPostfix()}`
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
}
