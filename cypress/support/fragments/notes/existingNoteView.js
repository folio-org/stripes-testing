import { Button } from '../../../../interactors';
import AgreementDetails from '../agreements/agreementsDetails';
import ExistingNoteEdit from './existingNoteEdit';

export default class ExistingNoteView {
    // TODO: update to css selector with id(id will be added in the future)
    static #rootXpath = '//section[@id="noteGeneralInfo"]/../../../..';
    static #noteTitleXpath = `${this.#rootXpath}//div[.="Note title"]/..//span`;
    static #detialsXpath = `${this.#rootXpath}//div[.="Details"]/..//p`;


    static #actionsButton = Button('Actions');
    static #editButton = Button('Edit');

    static waitLoading() {
      cy.xpath(this.#noteTitleXpath).should('be.visible');
    }

    static gotoEdit() {
      cy.do(this.#actionsButton.click());
      cy.expect(this.#editButton.exists());

      cy.do(this.#editButton.click());
      ExistingNoteEdit.waitLoading();
    }

    static checkProperties(note) {
      cy.xpath(`${this.#noteTitleXpath}[.='${note.title}']`).should('be.visible');
      cy.xpath(`${this.#detialsXpath}[.='${note.details}']`).should('be.visible');
    }

    static close() {
      cy.xpath(`${this.#rootXpath}//button[@icon='times']`).click();
      cy.xpath(this.#rootXpath).should('not.exist');
      AgreementDetails.waitLoading();
    }
}
