import { RichEditor, TextField, Button } from '../../../../interactors';

export default class ExistingNoteEdit {
  static #rootCss = 'section[id=notes-form]';
  static #nameCss = `${this.#rootCss} input[name=title]`;
  static #detailsCss = `${this.#rootCss} div[class*=editor]>p`;

  static #titleTextField = TextField('Note title*');
  static #detailsTextField = RichEditor('Details');

  static #saveButton = Button('Save & close');

  static get rootCss() {
    return this.#rootCss;
  }

  static fill(specialNote) {
    cy.do([
      this.#titleTextField.fillIn(specialNote.title),
      RichEditor('Details').fillIn(specialNote.details),
    ]);
  }

  static save() {
    cy.do(this.#saveButton.click());
  }

  static waitLoading() {
    cy.get(this.#rootCss).should('be.visible');
    cy.get(this.#detailsCss).should('be.visible');
  }
}
