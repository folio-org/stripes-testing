import { Accordion, Button, including, HTML, Section, MultiColumnListCell, Badge, Modal } from '../../../../interactors';
import NewNote from '../notes/newNote';
import { getLongDelay } from '../../utils/cypressTools';
import ExistingNoteEdit from '../notes/existingNoteEdit';


const rootXpath = '//section[@id="pane-view-agreement"]';
const rootSection = Section({ id : 'pane-view-agreement' });
const headerXpath = `${rootXpath}//div[@id="pane-view-agreement-content"]//h2`;
const rootCss = 'section[id=pane-view-agreement]';
const notesSectionXpath = `${rootXpath}//section[@id="notes"]`;
const noteTitleXpath = `${notesSectionXpath}//strong[contains(.,'Title')]/..`;
const notesAccordionXpath = `${notesSectionXpath}//button[@id="accordion-toggle-button-notes"]`;


const newNoteButton = Button('New', { id: 'note-create-button' });
const actionsButton = Button('Actions');
const deleteButton = Button('Delete');
const deleteButtonInConfirmation = Button('Delete', { id: 'clickable-delete-agreement-confirmation-confirm' });
const showMoreLink = Button('Show more');
const notesAccordion = rootSection.find(Accordion({ id: 'notes' }));
const deleteConfirmationModal = Modal({ id: 'delete-agreement-confirmation' });

function waitLoading() {
  cy.xpath(headerXpath).should('be.visible');
  cy.xpath(notesAccordionXpath).should('be.visible');
}

export default {
  waitLoading,
  waitLoadingWithExistingNote(title) {
    waitLoading();
    cy.expect(rootSection.find(Section({ id: 'notes' })).find(MultiColumnListCell({ columnIndex:1 })).find(HTML(including(title))).exists());
  },
  openNotesSection() {
    cy.do(rootSection.find(Section({ id :'notes' })).find(Button({ id:'accordion-toggle-button-notes' })).click());
    cy.expect(rootSection.find(newNoteButton).exists());
  },
  createNote(specialNote = NewNote.defaultNote) {
    cy.do(newNoteButton.click());
    NewNote.fill(specialNote);
    NewNote.save();
  },
  checkNotesCount(notesCount) {
    cy.expect(rootSection.find(Section({ id: 'notes' }).find(Badge())).has({ value: notesCount.toString() }));
  },
  specialNotePresented(noteTitle = NewNote.defaultNote.title) {
    cy.xpath(noteTitleXpath)
      .should('contains.text', noteTitle);
  },
  remove() {
    cy.do(actionsButton.click());
    cy.do(deleteButton.click());
    cy.expect(deleteConfirmationModal.exists());
    cy.do(deleteConfirmationModal.find(deleteButtonInConfirmation).click());
    cy.get(rootCss, getLongDelay()).should('not.exist');
  },
  close() {
    cy.xpath(`${rootXpath}//button[@icon='times']`).click();
    cy.get(rootCss).should('not.exist');
  },
  editNote(originalNoteTitle, newNote) {
    cy.xpath(`${noteTitleXpath}/../div[contains(.,'${originalNoteTitle}')]/../div/button`)
      .click();
    ExistingNoteEdit.fill(newNote);
    ExistingNoteEdit.save();
  },
  checkNoteShowMoreLink(specialNoteDetails) {
    cy.do(showMoreLink.click());
    cy.expect(notesAccordion
      .find(HTML(including(specialNoteDetails))).exists());
  },
  checkShortedNoteDetails(specialShortNoteDetails) {
    cy.expect(notesAccordion
      .find(HTML(including(specialShortNoteDetails))).exists());
  },
  openNoteView(specialNote) {
    cy.do(notesAccordion.find(MultiColumnListCell(including(specialNote.details))).click());
  }
};
