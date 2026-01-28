import { HTML, including } from '@interactors/html';
import {
  and,
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
  MultiColumnListRow,
} from '../../../../interactors';
import ExportDetails from './exportDetails';

const searchPane = Pane('Search & filter');
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
const getSearchResult = (row = 0, col = 0) => MultiColumnListCell({ row, columnIndex: col });

const jobDetailsPane = Pane('Export job ');
const jobsDetailsPane = Pane('Export jobs');
const exportJobsList = MultiColumnList({ id: 'export-jobs-list' });
const exportEdiJobsList = MultiColumnList({ id: 'export-edi-jobs-list' });

const statusFilters = {
  Scheduled: statusAccordion.find(Checkbox({ id: 'clickable-filter-status-scheduled' })),
  'In progress': statusAccordion.find(Checkbox({ id: 'clickable-filter-status-in-progress' })),
  Successful: statusAccordion.find(Checkbox({ id: 'clickable-filter-status-successful' })),
  Failed: statusAccordion.find(Checkbox({ id: 'clickable-filter-status-failed' })),
};
const jobTypeFilters = {
  'Authority control': jobTypeAccordion.find(
    Checkbox({ id: 'clickable-filter-type-auth-headings-updates' }),
  ),
  Bursar: jobTypeAccordion.find(Checkbox({ id: 'clickable-filter-type-bursar-fees-fines' })),
  'Circulation log': jobTypeAccordion.find(
    Checkbox({ id: 'clickable-filter-type-circulation-log' }),
  ),
  eHoldings: jobTypeAccordion.find(Checkbox({ id: 'clickable-filter-type-e-holdings' })),
  'Orders (EDI)': jobTypeAccordion.find(Checkbox({ id: 'clickable-filter-type-orders-edi' })),
  'Orders (CSV)': jobTypeAccordion.find(Checkbox({ id: 'clickable-filter-type-orders-csv' })),
  'Bulk edit': jobTypeAccordion.find(Checkbox({ id: 'clickable-filter-type-bulk-edit' })),
  'EDIFACT orders export': jobTypeAccordion.find(
    Checkbox({ id: 'clickable-filter-type-orders-edi' }),
  ),
  'CSV orders export': jobTypeAccordion.find(Checkbox({ id: 'clickable-filter-type-orders-csv' })),
};
const exportFilters = {
  'Reset all': Button({ id: 'reset-job-exports-filters' }),
  ...statusFilters,
  ...jobTypeFilters,
};
// Cypress clicks before the UI loads, use when there is no way to attach waiter to element
const waitClick = () => {
  cy.wait(2000);
};
const exportJob = (jobId) => {
  // TODO: redesign to interactors
  cy.get(`a:contains(${jobId})`).first().click();
};

export default {
  getSearchResult,
  exportJob,
  exportJobRecursively({ jobId, timeout = 900000 }) {
    cy.recurse(
      () => {
        return cy.contains('[class^=mclRow-]', jobId);
      },
      ($el) => {
        const isInProgress = $el[0].textContent.includes('In progress');

        if (isInProgress) {
          cy.reload();
        }
        return !isInProgress;
      },
      {
        delay: 30000,
        limit: timeout / 30000, // max number of iterations
        timeout,
      },
    ).then(() => {
      this.exportJob(jobId);
    });
  },
  waitLoading() {
    cy.expect([
      jobsDetailsPane.exists(),
      HTML('Choose a filter or enter a search query to show results.').exists(),
    ]);
  },
  waitFiltersLoading() {
    cy.expect([
      Accordion({ id: 'isSystemSource' }).exists(),
      Accordion({ id: 'createdByUserId' }).exists(),
    ]);
  },
  waitForJobs() {
    cy.expect(MultiColumnList().exists());
  },
  checkDefaultView() {
    this.checkTabHighlighted({ tabName: 'All' });
    this.checkNoResultsMessage();
  },
  checkTabHighlighted({ tabName }) {
    cy.expect(searchPane.find(Button(tabName)).has({ className: including('primary') }));
  },
  checkNoResultsMessage() {
    cy.expect(HTML('Choose a filter or enter a search query to show results.').exists());
  },
  selectJob(content) {
    cy.do(MultiColumnListCell(including(content)).click());
  },

  sortByJobID() {
    cy.do(exportEdiJobsList.find(Button({ id: 'clickable-list-column-jobid' })).click());
  },

  verifyResultAndClick(content) {
    cy.expect(MultiColumnListCell(including(content)).exists());
    cy.do(MultiColumnListRow({ index: 0 }).click());
  },

  openJobDetailView(jobId) {
    cy.then(() => exportJobsList.find(MultiColumnListCell(jobId)).row()).then((rowIndex) => {
      cy.do(exportJobsList.find(MultiColumnListRow({ index: rowIndex })).click());
    });
  },

  getElementByTextAndVerify(content, amount, index) {
    const matchingElements = [];
    cy.get('div[class*=mclRow-]')
      .each((element) => {
        if (Cypress.$(element).text().includes(content)) {
          matchingElements.push(element);
        }
      })
      .then(() => {
        cy.get(matchingElements[index]).click();
        cy.expect(matchingElements.length).to.eq(amount);
      });
  },

  searchById(id) {
    cy.do([TextField().fillIn(id), searchButton.click()]);
  },

  selectSearchResultItem(indexRow = 0) {
    return cy.do(this.getSearchResult(indexRow, 0).click());
  },

  selectJobByIntegrationInList(integrationName) {
    cy.wait(6000);
    cy.do(exportEdiJobsList.find(MultiColumnListCell(integrationName)).click());

    ExportDetails.waitLoading();

    return ExportDetails;
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
    this.checkFilterOption({ filterName: 'Scheduled' });
  },

  searchByInProgress() {
    waitClick();
    this.checkFilterOption({ filterName: 'In progress' });
  },

  searchBySuccessful() {
    waitClick();
    this.checkFilterOption({ filterName: 'Successful' });
    cy.wait(4000);
  },

  searchByFailed() {
    waitClick();
    this.checkFilterOption({ filterName: 'Failed' });
  },

  searchByAuthorityControl() {
    waitClick();
    this.checkFilterOption({ filterName: 'Authority control' });
  },

  searchByBursar() {
    waitClick();
    this.checkFilterOption({ filterName: 'Bursar' });
  },

  searchByCirculationLog() {
    waitClick();
    this.checkFilterOption({ filterName: 'Circulation log' });
  },

  searchByEHoldings() {
    waitClick();
    this.checkFilterOption({ filterName: 'eHoldings' });
  },

  searchByBulkEdit() {
    waitClick();
    this.checkFilterOption({ filterName: 'Bulk edit' });
  },

  verifyBulkEditCheckboxAbsent() {
    cy.expect(jobTypeAccordion.find(Checkbox({ label: 'Bulk edit' })).absent());
  },

  searchByEdifactOrders() {
    waitClick();
    this.checkFilterOption({ filterName: 'EDIFACT orders export' });
  },

  searchByCsvOrders() {
    waitClick();
    this.checkFilterOption({ filterName: 'CSV orders export' });
  },

  checkFilterOption({ filterName, resetAll = false }) {
    if (resetAll) {
      cy.do(exportFilters['Reset all'].click());
    }
    cy.do(exportFilters[filterName].click());

    // wait filter to be applied
    cy.wait(1000);
  },
  checkFilterOptions({ jobTypeFilterOption = [] } = {}) {
    jobTypeFilterOption.forEach((filterOption) => {
      cy.expect(jobTypeFilters[filterOption].exists());
      cy.expect([jobTypeAccordion.find(Checkbox(filterOption)).has({ checked: false })]);
    });
  },

  checkColumnInResultsTable({ status, jobType } = {}) {
    if (status) {
      this.checkColumnValues({ columnIndex: 1, value: status });
    }
    if (jobType) {
      this.checkColumnValues({ columnIndex: 2, value: jobType });
    }
  },
  checkColumnValues({ columnIndex, value }) {
    cy.then(() => exportJobsList.rowCount()).then((rowsCount) => {
      [...Array(rowsCount).keys()].forEach((index) => {
        cy.expect(
          exportJobsList
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ columnIndex }))
            .has({ content: including(value) }),
        );
      });
    });
  },
  verifyResult(content) {
    cy.expect(MultiColumnListCell(including(content)).exists());
  },

  verifyNoResultsFound() {
    cy.expect(jobsDetailsPane.find(HTML('No results found. Please check your filters.')).exists());
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

  enterStartTime(fromDate, toDate) {
    cy.do([
      startTimeAccordion.clickHeader(),
      startTimeAccordion.find(startDateTextfield).fillIn(fromDate),
      startTimeAccordion.find(endDateTextfield).fillIn(toDate),
      startTimeAccordion.find(applyButton).click(),
    ]);
  },

  resetStartTime() {
    cy.do(
      startTimeAccordion.find(Button({ ariaLabel: 'Clear selected Start time filters' })).click(),
    );
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
    cy.do(endTimeAccordion.find(Button({ ariaLabel: 'Clear selected End time filters' })).click());
  },

  searchBySystemNo() {
    waitClick();
    cy.do([systemAccordion.clickHeader(), systemAccordion.find(Checkbox({ label: 'No' })).click()]);
  },

  searchBySourceUserName(username) {
    cy.do([
      sourceAccordion.clickHeader(),
      sourceAccordion.find(Button({ id: 'undefined-button' })).click(),
      Modal('Select User').find(TextField()).fillIn(username),
      searchButton.click(),
    ]);
  },

  downloadLastCreatedJob(jobId) {
    // TODO: redesign to interactors
    cy.get(`a:contains(${jobId})`).first().click();
  },

  verifyUserSearchResult(username) {
    cy.expect(userSearchResults.has({ text: including(username) }));
  },

  selectOrganizationsSearch() {
    cy.do(searchPane.find(Button('Organizations')).click());
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
    cy.expect(HTML("You don't have permission to view this app/record").exists());
  },

  verifyJobDataInResults(expectedValuesArray, useEdiJobsList = false) {
    const jobsList = useEdiJobsList ? exportEdiJobsList : exportJobsList;
    cy.expect(
      jobsList
        .find(
          MultiColumnListRow({
            content: and(...expectedValuesArray.map((value) => including(value))),
          }),
        )
        .exists(),
    );
  },

  verifyJobDataInDetailView(expectedValuesObject) {
    cy.expect([
      jobDetailsPane.find(KeyValue('Job ID')).has({ value: expectedValuesObject.jobID }),
      jobDetailsPane.find(KeyValue('Status')).has({ value: expectedValuesObject.status }),
      jobDetailsPane.find(KeyValue('Job type')).has({ value: expectedValuesObject.jobType }),
      jobDetailsPane.find(KeyValue('Description')).has({ value: expectedValuesObject.description }),
      jobDetailsPane.find(KeyValue('Output type')).has({ value: expectedValuesObject.outputType }),
      jobDetailsPane.find(KeyValue('Source')).has({ value: expectedValuesObject.source }),
      jobDetailsPane
        .find(KeyValue('Start time'))
        .has({ value: including(expectedValuesObject.startDate) }),
      jobDetailsPane
        .find(KeyValue('End time'))
        .has({ value: including(expectedValuesObject.startDate) }),
    ]);
  },

  verifyJobStatusInDetailView(status) {
    cy.expect(jobDetailsPane.find(KeyValue('Status')).has({ value: status }));
  },

  verifyJobOrganizationInDetailView(organization) {
    cy.expect(jobDetailsPane.find(KeyValue('Organization')).has({ value: organization.name }));
  },

  verifyJobExportMethodInDetailView(integrationName) {
    cy.expect(jobDetailsPane.find(KeyValue('Export method')).has({ value: integrationName }));
  },

  verifyExportedFileName(actualName) {
    // valid name example: 2023-10-05_10-34-45_1166_123355-3551879_package
    expect(actualName).to.match(
      /^cypress\/downloads\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d+_\d+-\d+_package\.csv$/,
    );
  },

  verifyContentOfExportFile(actual, ...expectedArray) {
    expectedArray.forEach((expectedItem) => expect(actual).to.include(expectedItem));
  },

  clickJobId(jobId) {
    cy.window()
      .document()
      .then((doc) => {
        doc.addEventListener('click', () => {
          // this adds a listener that reloads your page
          // after 5 seconds from clicking the download button
          setTimeout(() => {
            doc.location.reload();
          }, 5000);
        });
        cy.get("[data-testid='text-link']").contains(jobId).click();
      });
    waitClick();
  },

  verifyJobsCountInResults(expectedCount) {
    cy.then(() => exportEdiJobsList.rowCount()).then((actualCount) => {
      expect(actualCount).to.equal(expectedCount);
    });
  },
};
