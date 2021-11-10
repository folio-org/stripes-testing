import { Button } from '../../../../interactors';
import NewNote from '../notes/newNote';

export default class AgreementDetails {
  static #rootXpath = '//section[@id="pane-view-agreement"]';
  static #headerXpath = `${this.#rootXpath}//div[@id="pane-view-agreement-content"]//h2`;
  static #noteBadgeXpath = `${this.#rootXpath}//section[@id="notes"]//span[contains(@class,"label")]/span`;
  static #notesSectionXpath = `${this.#rootXpath}//section[@id="notes"]`;
  static #noteTitleXpath = `${this.#notesSectionXpath}//strong[contains(.,'Title')]/..`;
  static #notesAccordionXpath = `${this.#notesSectionXpath}//button[@id="accordion-toggle-button-notes"]`;

  static #assignUnassignNotButton = Button('Assign / Unassign');
  static #newNoteButton = Button('New', { id: 'note-create-button' });
  static #actionsButton = Button('Actions');
  static #deleteButton = Button('Delete');
  static #deleteButtonInConfirmation = Button('Delete', { id: 'clickable-delete-agreement-confirmation-confirm' });

  static waitLoading() {
    cy.xpath(this.#headerXpath)
      .should('be.visible');
  }

  static openNotesSection() {
    // TODO: resolve the issue with flaky step with accordion interactor
    cy.xpath(this.#notesAccordionXpath).click();

    cy.expect(this.#assignUnassignNotButton.exists());
    cy.expect(this.#newNoteButton.exists());
  }

  static createNote(specialNote = NewNote.defaultNote) {
    cy.do(this.#newNoteButton.click());
    NewNote.fill(specialNote);
    NewNote.save();
  }

  static checkNotesCount(notesCount) {
    cy.xpath(this.#noteBadgeXpath)
      .should('have.text', notesCount);
  }

  static specialNotePresented(noteTitle = NewNote.defaultNote.title) {
    cy.xpath(this.#noteTitleXpath)
      .should('contains.text', noteTitle);
  }

  static remove() {
    cy.do(this.#actionsButton.click());
    cy.do(this.#deleteButton.click());
    cy.expect(this.#deleteButtonInConfirmation.exists());
    cy.do(this.#deleteButtonInConfirmation.click());
  }
}
