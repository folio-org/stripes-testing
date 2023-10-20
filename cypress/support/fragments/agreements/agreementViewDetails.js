import { HTML } from '@interactors/html';
import {
  KeyValue,
  Pane,
  including,
  Accordion,
  Button,
  Section,
  Modal,
  Callout,
  Badge,
  MultiColumnListRow,
  MultiColumnListCell,
  Spinner,
  MultiColumnList,
  Checkbox,
  SelectionOption,
  SearchField,
  Link,
  Card,
  ListRow,
  Select,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import NewNote from '../notes/newNote';
import { getLongDelay } from '../../utils/cypressTools';
import EditAgreement from './editAgreement';

const rootSection = Section({ id: 'pane-view-agreement' });
const deleteButton = Button('Delete');
const editButton = Button('Edit');
const agreementLine = Section({ id: 'lines' }).find(Button('Agreement lines'));
const agreementLinesBadge = Section({ id: 'lines' }).find(Badge());
const actionsButton = Button('Actions');
const deleteConfirmationModal = Modal({ id: 'delete-agreement-confirmation' });
const agreementLineDeleteModel = Modal({ id: 'delete-agreement-line-confirmation' });
const newNoteButton = Button('New', { id: 'note-create-button' });
const assignUnassignButton = Button('Assign / Unassign', { id: 'note-assign-button' });
const notesList = MultiColumnList({ id: 'notes-list' });
const deleteButtonInConfirmation = Button('Delete', {
  id: 'clickable-delete-agreement-confirmation-confirm',
});
const showMoreLink = Button('Show more');
const notesAccordion = rootSection.find(Accordion({ id: 'notes' }));
const organizationsAccordion = rootSection.find(Accordion({ id: 'organizations' }));
const internalContactsAccordion = rootSection.find(Accordion({ id: 'internalContacts' }));
const supplementaryDocumentsAccordion = rootSection.find(Accordion({ id: 'supplementaryDocs' }));
const agreementLinesAccordion = rootSection.find(Accordion({ id: 'lines' }));
const agreementLinesList = agreementLinesAccordion.find(MultiColumnList());
const cancelButton = Button('Cancel');
const calloutSuccess = Callout({ type: 'success' });
const notesSection = Section({ id: 'notes' });
const viewAgreementPane = Pane({ id: 'pane-view-agreement' });
const newAgreementLineButton = Button({ id: 'add-agreement-line-button' });
const viewInAgreementLineSearchButton = Button({ id: 'agreement-line-search' });
const noteTypeDropdown = Select({ name: 'type' });
const agreementLineFilter = Button({ id: 'clickable-nav-agreementLines' });

function openAgreementLineAccordion() {
  cy.do(agreementLine.click());
}

function selectAgreementLine() {
  cy.do(
    Section({ id: 'lines' })
      .find(MultiColumnListRow({ index: 0 }))
      .click(),
  );
}

function addNewNote() {
  cy.do(newNoteButton.click());
}

export default {
  addNewNote,
  deleteAgreementLine() {
    openAgreementLineAccordion();
    selectAgreementLine();
    cy.do([
      Section({ id: 'pane-view-agreement-line' }).find(actionsButton).click(),
      deleteButton.click(),
      agreementLineDeleteModel.find(deleteButton).click(),
    ]);
    cy.expect([calloutSuccess.exists(), calloutSuccess.has({ text: 'Agreement line deleted' })]);
    cy.expect(agreementLinesBadge.has({ value: '0' }));
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(deleteButton.exists());
    cy.do(deleteButton.click());
    cy.expect(deleteButton.exists());
    cy.do(deleteConfirmationModal.find(deleteButton).click());
    cy.expect([calloutSuccess.exists(), calloutSuccess.has({ text: 'Agreement line deleted' })]);
  },

  waitLoadingWithExistingNote(title) {
    cy.expect(
      rootSection
        .find(notesSection)
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .find(HTML(including(title)))
        .exists(),
    );
  },

  waitLoading() {
    cy.expect(rootSection.exists());
  },

  openNotesSection() {
    cy.do(
      rootSection
        .find(notesSection)
        .find(Button({ id: 'accordion-toggle-button-notes' }))
        .click(),
    );
    cy.expect(rootSection.find(newNoteButton).exists());
  },

  openInternalContactsSection() {
    cy.do(
      internalContactsAccordion
        .find(Button({ id: 'accordion-toggle-button-internalContacts' }))
        .click(),
    );
    cy.expect(internalContactsAccordion.has({ open: true }));
  },

  openAgreementLineSection() {
    cy.do(agreementLinesAccordion.find(Button({ id: 'accordion-toggle-button-lines' })).click());
    cy.expect(agreementLinesAccordion.has({ open: true }));
  },

  openOrganizationsSection() {
    cy.do(organizationsAccordion.click());
    cy.expect(organizationsAccordion.has({ open: true }));
  },

  openSupplementaryDocumentsSection() {
    cy.do(
      supplementaryDocumentsAccordion
        .find(Button({ id: 'accordion-toggle-button-supplementaryDocs' }))
        .click(),
    );
    cy.expect(supplementaryDocumentsAccordion.has({ open: true }));
  },

  createNote(specialNote = NewNote.defaultNote, noteType) {
    addNewNote();
    if (noteType) {
      cy.do(noteTypeDropdown.choose(noteType));
    }
    NewNote.fill(specialNote);
    NewNote.save();
  },

  clickOnNoteRecord() {
    cy.expect(Spinner().absent());
    cy.do(notesList.click({ row: 0 }));
  },

  clickOnNoteRecordByTitle(title) {
    cy.do(
      notesList
        .find(MultiColumnListCell({ column: 'Title and details', content: including(title) }))
        .click(),
    );
  },

  clickAgreementLineRecordByTitle(title) {
    cy.do(
      agreementLinesList
        .find(MultiColumnListCell({ column: 'Name / Description', content: including(title) }))
        .click(),
    );
  },

  clickOnNewButton() {
    cy.expect(rootSection.exists());
    cy.do(rootSection.find(newNoteButton).click());
  },

  clickOnAssignUnassignButton() {
    cy.expect(rootSection.exists());
    cy.do(rootSection.find(assignUnassignButton).click());
  },

  checkNotesCount(notesCount) {
    cy.expect(
      rootSection
        .find(Section({ id: 'notes' }).find(Badge()))
        .has({ value: notesCount.toString() }),
    );
  },

  gotoEdit() {
    cy.do(actionsButton.click());
    cy.expect(editButton.exists());

    cy.do(editButton.click());
    EditAgreement.waitLoading();
  },

  verifyOrganizationsCount(itemCount) {
    cy.expect(organizationsAccordion.find(Badge()).has({ text: itemCount }));
  },

  verifyInternalContactsCount(itemCount) {
    cy.expect(internalContactsAccordion.find(Badge()).has({ text: itemCount }));
  },

  verifySupplementaryDocumentsCount(itemCount) {
    cy.expect(supplementaryDocumentsAccordion.find(Badge()).has({ text: itemCount }));
  },

  verifyOrganizationCardIsShown(organizationName) {
    cy.expect(
      organizationsAccordion.find(Card({ headerStart: including(organizationName) })).exists(),
    );
  },

  specialNotePresented(noteTitle = NewNote.defaultNote.title) {
    cy.expect(MultiColumnListCell({ row: 0, content: noteTitle }).exists());
  },

  delete() {
    cy.do([rootSection.find(actionsButton).click(), deleteButton.click()]);
    cy.expect(deleteConfirmationModal.exists());
    cy.do(deleteConfirmationModal.find(deleteButtonInConfirmation).click());
    cy.expect(viewAgreementPane, getLongDelay()).absent();
  },

  verifyNoteShowMoreLink(specialNoteDetails) {
    cy.do(showMoreLink.click());
    cy.expect(notesAccordion.find(HTML(including(specialNoteDetails))).exists());
  },

  verifyShortedNoteDetails(specialShortNoteDetails) {
    cy.expect(notesAccordion.find(HTML(including(specialShortNoteDetails))).exists());
  },

  openNoteView(specialNote) {
    cy.do(notesAccordion.find(MultiColumnListCell(including(specialNote.details))).click());
  },

  clickCancelButton() {
    cy.expect(cancelButton.exists());
    cy.do(cancelButton.click());
  },

  selectCurrentStatusInPackages() {
    cy.wait(4000);
    cy.do(
      Section({ id: 'filter-accordion-status' })
        .find(Checkbox({ id: 'clickable-filter-status-current' }))
        .click(),
    );
  },

  selectPackageFromList(row = 0) {
    cy.do(
      MultiColumnList({ id: 'list-packages' })
        .find(MultiColumnListRow({ indexRow: `row-${row}` }))
        .click(),
    );
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

  openAgreementLinesSection() {
    cy.do(Section({ id: 'lines' }).find(Button('Agreement lines')).click());
  },

  newAgreementLine(orderLineNumber) {
    cy.do(Section({ id: 'lines' }).find(actionsButton).click());
    cy.wait(4000);
    cy.do([
      Button('New agreement line').click(),
      Button({ id: 'linkedResource-basket-selector' }).click(),
      SelectionOption('ACM Digtal Library').click(),
      Button('Link selected e-resource').click(),
      Button('Add PO line').click(),
      Button('Link PO line').click(),
      Modal('Select order lines')
        .find(SearchField({ id: 'input-record-search' }))
        .fillIn(orderLineNumber),
      Modal('Select order lines')
        .find(Button({ type: 'submit' }))
        .click(),
      Modal('Select order lines')
        .find(MultiColumnList({ id: 'list-plugin-find-records' }))
        .find(MultiColumnListRow({ indexRow: 'row-0' }))
        .click(),
      Button('Save & close').click(),
    ]);
  },

  agreementListClick(agreementName) {
    cy.do(MultiColumnListCell(agreementName).click());
  },

  openEHoldingsPackageFromAgreementLine(name, rowNumber = 0) {
    cy.do(
      viewAgreementPane
        .find(Accordion('Agreement lines'))
        .find(MultiColumnListCell({ row: rowNumber, columnIndex: 0 }))
        .find(Link(name))
        .click(),
    );
  },

  verifyNotesIsEmpty() {
    cy.expect(notesList.absent());
  },

  verifyNotesCount(itemCount) {
    cy.expect(
      Accordion({ label: including('Notes') })
        .find(Badge())
        .has({ text: itemCount }),
    );
  },

  verifyAgreementLinesCount(itemCount) {
    cy.expect(agreementLinesAccordion.find(Badge()).has({ text: itemCount }));
  },

  verifyAgreementDetailsIsDisplayedByTitle(agreementTitle) {
    cy.expect(Pane(agreementTitle).exists());
  },

  verifySpecialNotesRow({ title, details, type }) {
    cy.expect([
      notesList.exists(),
      notesList
        .find(MultiColumnListCell({ column: 'Title and details', content: including(title) }))
        .exists(),
      notesList
        .find(MultiColumnListCell({ column: 'Title and details', content: including(details) }))
        .exists(),
      notesList.find(MultiColumnListCell({ column: 'Type', content: including(type) })).exists(),
    ]);
  },

  verifyInternalContactsRow({ username, email }) {
    cy.expect([
      internalContactsAccordion.find(Card(including(username))),
      internalContactsAccordion.find(KeyValue(including(email))).exists(),
    ]);
  },

  verifySupplementaryDocumentsRow({ name, category, note, location, url }) {
    const document = supplementaryDocumentsAccordion.find(Card({ headerStart: name }));
    cy.expect([
      document.exists(),
      document.find(KeyValue({ value: including(note) })).exists(),
      document.find(KeyValue({ value: including(category) })).exists(),
      document
        .find(ListRow(including('Physical location')))
        .find(MultiColumnListCell({ content: including(location) }))
        .exists(),
      document
        .find(ListRow(including('URL')))
        .find(MultiColumnListCell(including(url)))
        .exists(),
    ]);
  },

  verifySpecialAgreementLineRow({ description }) {
    cy.expect([
      agreementLinesList.exists(),
      agreementLinesList
        .find(
          MultiColumnListCell({ column: 'Name / Description', content: including(description) }),
        )
        .exists(),
    ]);
  },

  verifyOrganizationsAccordion(exists) {
    if (exists) {
      cy.expect(organizationsAccordion.exists());
    } else cy.expect(organizationsAccordion.absent());
  },

  verifyAgreementDetails(defaultAgreement) {
    cy.expect([
      viewAgreementPane.find(HTML(including(defaultAgreement.name))).exists(),
      KeyValue('Status').has({ value: defaultAgreement.status }),
      KeyValue('Period start').has({
        value: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
      }),
    ]);
  },

  verifyLastUpdatedDate() {
    const updatedDate = DateTools.getFormattedDateWithSlashes({ date: new Date() });

    cy.expect(
      viewAgreementPane.find(HTML(including(`Record last updated: ${updatedDate}`))).exists(),
    );
    cy.expect(
      Accordion({ headline: 'Update information' }).has({
        content: including(`Record created: ${updatedDate}`),
      }),
    );
  },

  verifyAgreementLinePresented(name) {
    cy.expect(viewAgreementPane.find(MultiColumnListCell({ content: name, row: 0 })).exists());
  },

  deletionOfAgreementLine() {
    openAgreementLineAccordion();
    selectAgreementLine();
    cy.do([
      Section({ id: 'pane-view-agreement-line' }).find(actionsButton).click(),
      deleteButton.click(),
      agreementLineDeleteModel.find(deleteButton).click(),
    ]);
    cy.expect([calloutSuccess.exists(), calloutSuccess.has({ text: 'Agreement line deleted' })]);
  },

  openLinkFromSupplementaryDocument(documentName) {
    const urlLink = supplementaryDocumentsAccordion
      .find(Card({ headerStart: documentName }))
      .find(ListRow(including('URL')))
      .find(Link());
    cy.do([urlLink.perform((el) => el.removeAttribute('target')), urlLink.click()]);
  },

  downloadFileFromSupplementaryDocument(documentName) {
    const fileLink = supplementaryDocumentsAccordion
      .find(Card({ headerStart: documentName }))
      .find(ListRow(including('File')))
      .find(Link());
    cy.do(fileLink.click());
    cy.intercept('GET', '/erm/files/**').as('downloadFile');
    cy.wait('@downloadFile').then((res) => {
      expect(res.response.statusCode).to.eq(200);
    });
  },

  clickActionsForAgreementLines() {
    cy.do([agreementLinesAccordion.find(actionsButton).click()]);
    cy.expect([newAgreementLineButton.exists(), viewInAgreementLineSearchButton.exists()]);
  },

  clickNewAgreementLine() {
    cy.do(newAgreementLineButton.click());
  },

  openAgreementLineFilter() {
    cy.do(agreementLineFilter.click());
  },
};
