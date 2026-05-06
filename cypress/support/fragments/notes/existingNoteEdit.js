import { RichEditor, TextField, Button, Select } from '../../../../interactors';

export default class ExistingNoteEdit {
  static #rootCss = 'section[id=notes-form]';
  static #nameCss = `${this.#rootCss} input[name=title]`;
  static #detailsCss = `${this.#rootCss} div[class*=editor]>p`;

  static #noteTypeSelect = Select('Note type');
  static #titleTextField = TextField('Note title*');
  static #detailsTextField = RichEditor({ id: 'note-details-field' });

  static #saveButton = Button('Save & close');

  static get rootCss() {
    return this.#rootCss;
  }

  static fillNoteFields(note) {
    if (note.type) {
      cy.do(this.#noteTypeSelect.choose(note.type));
    }
    cy.do([this.#titleTextField.fillIn(note.title), this.#detailsTextField.fillIn(note.details)]);
  }

  static changeNoteType(noteType) {
    cy.do(this.#noteTypeSelect.choose(noteType));
  }

  static saveNote() {
    cy.do(this.#saveButton.click());
  }

  static waitLoading() {
    cy.get(this.#rootCss).should('be.visible');
    cy.get(this.#detailsCss).should('be.visible');
  }
}
