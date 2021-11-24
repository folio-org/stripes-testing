import { Accordion, Button, including, HTML } from '../../../../interactors';
import NewNote from '../notes/newNote';
import { getLongDelay } from '../../utils/cypressTools';
import ExistingNoteEdit from '../notes/existingNoteEdit';
import Agreements from './agreements';
import NewAgreement from './newAgreement';

export default class AgreementDetails {
  static #rootXpath = '//section[@id="pane-view-agreement"]';
  static #rootCss = 'section[id=pane-view-agreement]';
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
  static #showMoreLink = Button('Show more');
  static #notesAccordion = Accordion({ id: 'notes' });

  // TODO: think to move changedHTML into /interactorsp
  static #changedHTML = HTML.extend('details')
    .filters({ tagName: el => el.tagName });


  static waitLoading() {
    cy.xpath(this.#headerXpath).should('be.visible');
    cy.xpath(this.#notesAccordionXpath).should('be.visible');
  }

  static waitLoadingWithExistingNote(title) {
    this.waitLoading();
    cy.xpath('//section[@id="notes"]//div[@id="notes-list"]//div[@role="gridcell"]//div/strong[contains(.,"Details")]/../span/p')
      .should('be.exist');
    cy.xpath('//section[@id="notes"]//div[@id="notes-list"]//div[@role="gridcell"]//div/strong[contains(.,"Title")]/..')
      .contains(title);
  }


  static openNotesSection() {
    cy.xpath(this.#notesAccordionXpath, getLongDelay())
      .should('be.visible')
      .click();

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

  static remove(agreementTitle = NewAgreement.defaultAgreement.name) {
    cy.do(this.#actionsButton.click());
    cy.do(this.#deleteButton.click());
    cy.do(this.#deleteButtonInConfirmation.click());
    cy.get(this.#rootCss, getLongDelay()).should('not.exist');
    Agreements.waitLoading();
    Agreements.agreementNotVisible(agreementTitle);
  }

  static close() {
    cy.xpath(`${this.#rootXpath}//button[@icon='times']`).click();
    cy.get(this.#rootCss).should('not.exist');
  }

  static editNote(originalNoteTitle, newNote) {
    cy.log(`${this.#noteTitleXpath}/../div[contains(.,'${originalNoteTitle}')]/../div/button`);
    cy.xpath(`${this.#noteTitleXpath}/../div[contains(.,'${originalNoteTitle}')]/../div/button`)
      .click();
    ExistingNoteEdit.fill(newNote);
    ExistingNoteEdit.save();
  }

  static checkNoteShowMoreLink(specialNoteDetails) {
    cy.do(this.#showMoreLink.click());
    cy.expect(this.#notesAccordion
      .find(HTML(including(specialNoteDetails))).exists());
  }

  static checkShortedNoteDetails(specialShortNoteDetails) {
    cy.expect(this.#notesAccordion
      .find(HTML(including(specialShortNoteDetails))).exists());
  }

  static openNoteView(specialNote) {
    // TODO: the issue on interactor side, in process of investigation by Fronside

    // cy.do(this.#notesAccordion
    // .find(HTML(including(specialNote.getShortDetails()), { classList: including(including('mclRow')) }))
    // .click());

    cy.do(this.#notesAccordion
      .find(this.#changedHTML({ text: specialNote.details,
        tagName: 'P' }))
      .click());
  }
}
