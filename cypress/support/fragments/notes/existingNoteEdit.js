import { RichEditor, TextField, Button } from '../../../../interactors';

const editButton = Button({ id: 'clickable-edit-noteTypes-1' });
const nameTextfield = TextField('Note type 1');
const saveButton = Button('Save');


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
      cy.do([this.#titleTextField.fillIn(specialNote.title),
        RichEditor('Details').fillIn(specialNote.details)]);
    }

    static save() {
      cy.do(this.#saveButton.click());
    }

    static waitLoading() {
      cy.get(this.#rootCss).should('be.visible');
      cy.get(this.#detailsCss).should('be.visible');
    }

    static clickEditButton(name) {
      cy.do(editButton.click());
      cy.do(nameTextfield.fillIn(name));
      cy.do(saveButton.click());
    }
}
