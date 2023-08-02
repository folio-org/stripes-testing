import { including } from 'bigtest';
import {
  Pane,
  Button,
  TextField,
  MultiColumnListCell,
  Accordion,
  Checkbox,
  Modal,
  SelectionOption,
  MultiColumnList,
  PaneHeader,
  KeyValue,
  HTML,
  MultiColumnListRow,
} from '../../../../interactors';

const searchButton = Button({ type: 'submit' });
const userSearchResults = Pane('User Search Results');
const startTimeAccordion = Accordion({ id: 'startTime' });
const endTimeAccordion = Accordion({ id: 'endTime' });
const systemAccordion = Accordion({ id: 'isSystemSource' });
const sourceAccordion = Accordion({ id: 'createdByUserId' });
const jobTypeAccordion = Accordion({ id: 'type' });
const statusAccordion = Accordion('Status');
const startDateTextfield = TextField({ name: 'startDate' });
const endDateTextfield = TextField({ name: 'endDate' });
const applyButton = Button('Apply');
const getSearchResult = (row = 0, col = 0) => MultiColumnListCell({ 'row': row, 'columnIndex': col });

// Cypress clicks before the UI loads, use when there is no way to attach waiter to element
const waitClick = () => { cy.wait(1000); };

export default {
  getSearchResult,
  waitLoading() {
    cy.expect([
      Pane('Export jobs').exists(),
      HTML('Choose a filter or enter a search query to show results.').exists()
    ]);
  },

  selectJob(content) {
    return cy.do(MultiColumnListCell(including(content)).click());
  },
  verifyResultAndClick(content) {
    cy.expect(MultiColumnListCell(including(content)).exists());
    cy.do(MultiColumnListRow({ index:0 }).click());
  },
  selectJobByIndex(content, index) {
    cy.get('div[class*=mclRow-]').contains(content).then(element => {
      element.prevObject[index].click();
    });
  },

  verifyJobAmount(text, amount) {
    cy.get('div[class*=mclRow-]').contains(text).then(element => {
      expect(element.prevObject.length).to.eq(amount);
    });
  },

  searchById(id) {
    cy.do([
      TextField().fillIn(id),
      searchButton.click(),
    ]);
  },

  selectSearchResultItem(indexRow = 0) {
    return cy.do(this.getSearchResult(indexRow, 0).click());
  },

  selectJobByIntegrationInList(integrationName) {
    cy.wait(6000);
    cy.do(MultiColumnList({ id: 'export-edi-jobs-list' }).find(MultiColumnListCell(integrationName)).click());
  },

  closeExportJobPane() {
    cy.do(Button({ ariaLabel: 'Close Export job ' }).click());
  },

  resetAll() {
    cy.do(Button('Reset all').click());
    waitClick();
  },

  resetJobType() {
    cy.do(jobTypeAccordion.find(Button({ icon: 'times-circle-solid' })).click());
    waitClick();
  },

  searchByScheduled() {
    waitClick();
    cy.do(statusAccordion.find(Checkbox({ id: 'clickable-filter-status-scheduled' })).click());
  },

  searchByInProgress() {
    waitClick();
    cy.do(statusAccordion.find(Checkbox({ id: 'clickable-filter-status-in-progress' })).click());
  },

  searchBySuccessful() {
    waitClick();
    cy.do(statusAccordion.find(Checkbox({ id: 'clickable-filter-status-successful' })).click());
  },

  searchByFailed() {
    waitClick();
    cy.do(statusAccordion.find(Checkbox({ id: 'clickable-filter-status-failed' })).click());
  },

  verifyResult(content) {
    cy.expect(MultiColumnListCell(including(content)).exists());
  },

  verifyThirdPaneExportJobExist() {
    cy.wait(10000);
    cy.expect(PaneHeader('Export job ').exists());
  },

  clickJobIdInThirdPane() {
    this.verifyThirdPaneExportJobExist();
    cy.do(KeyValue('Job ID').clickLink());
    // Wait for the file to download
    cy.wait(5000);
  },

  verifyJobIdInThirdPaneHasNoLink() {
    this.verifyThirdPaneExportJobExist();
    cy.expect(KeyValue('Job ID').has({ hasLink: false }));
  },

  searchByBulkEdit() {
    waitClick();
    cy.do(jobTypeAccordion.find(Checkbox({ id: 'clickable-filter-type-bulk-edit' })).click());
  },

  searchByCirculationLog() {
    waitClick();
    cy.do(jobTypeAccordion.find(Checkbox({ id: 'clickable-filter-type-circulation-log' })).click());
  },

  enterStartTime(fromDate, toDate) {
    cy.do([
      startTimeAccordion.clickHeader(),
      startTimeAccordion.find(startDateTextfield).fillIn(fromDate),
      startTimeAccordion.find(endDateTextfield).fillIn(toDate),
      startTimeAccordion.find(applyButton).click(),
    ]);
  },

  resetStartTime() {
    cy.do(startTimeAccordion.find(Button({ ariaLabel: 'Clear selected filters for "[object Object]"' })).click());
  },

  enterEndTime(fromDate, toDate) {
    waitClick();
    cy.do([
      endTimeAccordion.clickHeader(),
      endTimeAccordion.find(startDateTextfield).fillIn(fromDate),
      endTimeAccordion.find(endDateTextfield).fillIn(toDate),
      endTimeAccordion.find(applyButton).click(),
    ]);
  },

  resetEndTime() {
    cy.do(endTimeAccordion.find(Button({ ariaLabel: 'Clear selected filters for "[object Object]"' })).click());
  },

  searchBySystemNo() {
    waitClick();
    cy.do([
      systemAccordion.clickHeader(),
      systemAccordion.find(Checkbox({ label: 'No' })).click(),
    ]);
  },

  searchBySourceUserName(username) {
    cy.do([
      sourceAccordion.clickHeader(),
      sourceAccordion.find(Button({ id: 'undefined-button' })).click(),
      Modal('Select User').find(TextField()).fillIn(username),
      searchButton.click(),
    ]);
  },

  searchByAuthorityControl() {
    waitClick();
    cy.do(jobTypeAccordion.find(Checkbox({ id: 'clickable-filter-type-auth-headings-updates' })).click());
  },

  downloadLastCreatedJob(jobId) {
    // TODO: redesign to interactors
    cy.get(`a:contains(${jobId})`).first().click();
  },

  verifyUserSearchResult(username) {
    cy.expect(userSearchResults.has({ text: including(username) }));
  },

  selectOrganizationsSearch() {
    Button('Organizations').click();
  },

  selectExportMethod(integarationName) {
    cy.do([
      Button({ id: 'accordion-toggle-button-exportConfigId' }).click(),
      Button({ id: 'exportConfigId-selection' }).click(),
      SelectionOption(integarationName).click(),
    ]);
  },

  downloadJob() {
    // Need to wait while Button will be loaded for click
    cy.wait(7000);
    cy.do(Button('Actions').click());
    // Need to wait while Button will be loaded for click
    cy.wait(7000);
    cy.do(Button('Download').click());
  },

  rerunJob() {
    // Need to wait while Button will be loaded for click
    cy.wait(7000);
    cy.do(Button('Actions').click());
    // Need to wait while Button will be loaded for click
    cy.wait(7000);
    cy.do(Button('Rerun').click());
    cy.wait(7000);
  },

  verifyNoPermissionWarning() {
    cy.expect(HTML('You don\'t have permission to view this app/record').exists());
  },
};
