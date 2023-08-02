import { Accordion, Button, including, HTML, Section, MultiColumnListCell, Badge, Modal, Checkbox, MultiColumnList, MultiColumnListRow, SelectionOption, SearchField, Spinner } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import ExistingNoteEdit from '../notes/existingNoteEdit';
import NewNote from '../notes/newNote';

const rootXpath = '//section[@id="pane-view-agreement"]';
const rootSection = Section({ id: 'pane-view-agreement' });
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
const cancelButton = Button('Cancel');

function waitLoading() {
  cy.xpath(headerXpath).should('be.visible');
  cy.xpath(notesAccordionXpath).should('be.visible');
}

export default {
  waitLoading,

  waitLoadingWithExistingNote(title) {
    waitLoading();
    cy.expect(rootSection.find(Section({ id: 'notes' })).find(MultiColumnListCell({ columnIndex: 1 })).find(HTML(including(title))).exists());
  },

  openNotesSection() {
    cy.do(rootSection.find(Section({ id: 'notes' })).find(Button({ id: 'accordion-toggle-button-notes' })).click());
    cy.expect(rootSection.find(newNoteButton).exists());
  },

  createNote(specialNote = NewNote.defaultNote) {
    cy.do(newNoteButton.click());
    NewNote.fill(specialNote);
    NewNote.save();
  },

  clickOnNoteRecord() {
    cy.expect(Spinner().absent());
    cy.do((MultiColumnList({ id: 'notes-list' }).click({ row: 0 })));
  },

  clickOnNewButton() {
    cy.expect(rootSection.exists());
    cy.do(rootSection.find(newNoteButton).click());
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
  },

  switchToLocalKBSearch() {
    cy.do(Button('Local KB search').click());
  },

  clickCancelButton() {
    cy.expect((cancelButton).exists());
    cy.do(cancelButton.click());
  },

  selectCurrentStatusInPackages() {
    cy.wait(4000);
    cy.do(Section({ id: 'filter-accordion-status' }).find(Checkbox({ id: 'clickable-filter-status-current' })).click());
  },

  selectPackageFromList(row = 0) {
    cy.do(MultiColumnList({ id: 'list-packages' }).find(MultiColumnListRow({ indexRow: `row-${row}` })).click());
  },

  addPackageToBusket() {
    cy.do(Section({ id: 'pane-view-eresource' }).find(Button('Add package to basket')).click());
  },

  openBusket() {
    cy.do(Button({ id: 'open-basket-button' }).click());
  },

  createNewAgreementInBusket() {
    cy.do(Button('Create new agreement').click());
  },

  openAgreementLines() {
    cy.do(Section({ id: 'lines' }).find(Button('Agreement lines')).click());
  },

  newAgreementLine(orderLine) {
    cy.do(Section({ id: 'lines' }).find(actionsButton).click());
    cy.wait(4000);
    cy.do([
      Button('New agreement line').click(),
      Button({ id: 'linkedResource-basket-selector' }).click(),
      SelectionOption('Accounting Finance and Economics eJournal collection').click(),
      Button('Link selected e-resource').click(),
      Button('Add PO line').click(),
      Button('Link PO line').click(),
      Modal('Select order lines').find(SearchField({ id: 'input-record-search' })).fillIn(orderLine),
      Modal('Select order lines').find(Button({ type: 'submit' })).click(),
      Modal('Select order lines').find(MultiColumnList({ id: 'list-plugin-find-records' }))
        .find(MultiColumnListRow({ indexRow: 'row-0' }))
        .click(),
      Button('Save & close').click()
    ]);
  },

  agreementListClick(agreementName) {
    cy.do(MultiColumnListCell(agreementName).click());
  }
};
