import {
  Button,
  Checkbox,
  Pane,
  TextField,
  Option,
  Form,
  HTML,
  Accordion,
  Image,
  MultiColumnList,
  Selection,
  SelectionList,
  MultiColumnListCell,
} from '../../../../interactors';

const viewAllLogsButton = Button('View all');
const searchAndFilterPane = Pane('Search & filter');
const idDropdownOption = Option('ID');
const recordSearchTextField = TextField({ id: 'input-record-search' });
const searchForm = Form();
const resetAllButton = Button('Reset all');
const errorsInExportAccordion = Accordion({ headline: 'Errors in export' });
const startedRunningAccordion = Accordion({ headline: 'Started running' });
const endedRunningAccordion = Accordion({ headline: 'Ended running' });
const jobProfileAccordion = Accordion({ headline: 'Job profile' });
const userAccordion = Accordion({ headline: 'User' });
const logsMainPane = Pane('Logs');
const logsIcon = Image({ alt: 'Data export loader for MARC records' });
const recordsFoundText = HTML({ id: 'paneHeaderdata-export-logs-pane-subtitle' });
const logsTable = MultiColumnList();
const errorsInExportYesOptionId = 'clickable-filter-status-fail';
const errorsInExportNoOptionId = 'clickable-filter-status-completed';
const errorsInExportCrossButton = Button({ icon: 'times-circle-solid' });
const jobProfileSelection = Selection({ singleValue: 'Choose job profile' });
const jobProfileSelectionList = SelectionList({ placeholder: 'Filter options list' });
const jobProfileClearButton = Button({ icon: 'times-circle-solid' });

export default {
  openAllJobLogs() {
    cy.do(viewAllLogsButton.click());
  },

  verifySearchAndFilterPane() {
    cy.expect(searchAndFilterPane.exists());
  },

  verifyIDOption() {
    cy.expect(idDropdownOption.exists());
  },

  verifyRecordSearch() {
    cy.expect(recordSearchTextField.exists());
  },

  verifySearchButton() {
    cy.expect(searchForm.find(HTML({ text: 'Search' })).exists());
  },

  verifySearchButtonIsDisabled() {
    cy.expect(searchForm.find(Button({ type: 'submit' })).has({ disabled: true }));
  },

  verifyResetAllButton() {
    cy.expect(searchAndFilterPane.find(HTML({ text: 'Reset all' })).exists());
  },

  verifyResetAllIsDisabled(isDisabled = true) {
    cy.expect(resetAllButton.has({ disabled: isDisabled }));
  },

  verifyErrorsInExportAccordion() {
    cy.expect(errorsInExportAccordion.exists());
  },

  verifyErrorsAccordionIsExpanded() {
    cy.expect(errorsInExportAccordion.has({ open: true }));
  },

  verifyStartedRunningAccordion() {
    cy.expect(startedRunningAccordion.exists());
  },

  verifyStartedRunningIsCollapsed() {
    cy.expect(startedRunningAccordion.has({ open: false }));
  },

  verifyEndedRunningAccordion() {
    cy.expect(endedRunningAccordion.exists());
  },

  verifyEndedRunningIsCollapsed() {
    cy.expect(endedRunningAccordion.has({ open: false }));
  },

  verifyJobProfileAccordion() {
    cy.expect(jobProfileAccordion.exists());
  },

  verifyJobProfileIsCollapsed(isCollapsed = true) {
    cy.expect(jobProfileAccordion.has({ open: !isCollapsed }));
  },

  verifyUserAccordionIsCollapsed() {
    cy.expect(userAccordion.has({ open: false }));
  },

  verifyLogsMainPane() {
    cy.expect(logsMainPane.exists());
  },

  verifyLogsIcon() {
    cy.expect(logsIcon.exists());
  },

  verifyRecordsFoundText() {
    cy.expect(recordsFoundText.exists());
  },

  verifyLogsTable() {
    cy.expect(logsTable.exists());
    cy.expect(logsTable.find(HTML('File name')).exists());
    cy.expect(logsTable.find(HTML('Status')).exists());
    cy.expect(logsTable.find(HTML('Total')).exists());
    cy.expect(logsTable.find(HTML('Exported')).exists());
    cy.expect(logsTable.find(HTML('Failed')).exists());
    cy.expect(logsTable.find(HTML('Job profile')).exists());
    cy.expect(logsTable.find(HTML('Started running')).exists());
    cy.get('div.mclScrollable---JvHuN').scrollTo('right');
    cy.expect(logsTable.find(HTML('Ended running')).exists());
    cy.expect(logsTable.find(HTML('Run by')).exists());
    cy.expect(logsTable.find(HTML({ id: 'list-column-hrid' })).exists());
  },

  verifyErrorsInExportOptions() {
    cy.expect(errorsInExportAccordion.find(Checkbox('No')).exists());
    cy.expect(errorsInExportAccordion.find(Checkbox('Yes')).exists());
  },

  checkErrorsInExportOption(option) {
    const checkboxToClick = option === 'Yes' ? errorsInExportYesOptionId : errorsInExportNoOptionId;
    cy.get(`#${checkboxToClick}`).check();
  },

  verifyStatusIncludesErrors() {
    cy.expect(logsTable.exists());
    cy.contains('Completed with errors').then((elements) => {
      cy.expect(elements.length > 0);
    });
    cy.contains('Failed').then((elements) => {
      cy.expect(elements.length > 0);
    });
  },

  verifyStatusIncludesAll() {
    cy.expect(logsTable.exists());
    cy.contains('Completed with errors').then((elements) => {
      cy.expect(elements.length > 0);
    });
    cy.contains('Failed').then((elements) => {
      cy.expect(elements.length > 0);
    });
    cy.contains('Completed').then((elements) => {
      cy.expect(elements.length > 0);
    });
  },

  clickTheCrossIcon() {
    cy.do(errorsInExportCrossButton.click());
  },

  verifyErrorsInExportCheckbox(option, expected) {
    const checkboxToCheck =
      option === 'Yes'
        ? Checkbox({ id: errorsInExportYesOptionId })
        : Checkbox({ id: errorsInExportNoOptionId });
    cy.expect(checkboxToCheck.has({ checked: expected }));
  },

  resetAll() {
    cy.wait(2000);
    cy.do(resetAllButton.click());
    cy.wait(1000);
  },

  verifyPaginatorExists() {
    cy.get('div[class^="prevNextPaginationContainer-"]').within(() => {
      cy.get('button[data-testid="prev-page-button"]').should('exist');
      cy.get('button[data-testid="next-page-button"]').should('exist');
    });
  },

  expandJobProfileAccordion() {
    cy.do(jobProfileAccordion.clickHeader());
  },

  verifyJobProfileDropdownExists() {
    cy.expect(jobProfileAccordion.find(jobProfileSelection).exists());
  },

  clickJobProfileDropdown() {
    cy.do(jobProfileAccordion.find(Selection()).open());
    cy.wait(1000);
  },

  verifyJobProfileInDropdown(profileName) {
    cy.then(() => jobProfileSelectionList.optionList()).then((options) => {
      cy.expect(options).to.include(profileName);
    });
  },

  verifyNumberOfFilteredJobProfiles(expectedCount) {
    cy.then(() => jobProfileSelectionList.optionList()).then((options) => {
      cy.expect(options.length).to.equal(expectedCount);
    });
  },

  filterJobProfileByName(profileName) {
    cy.get('input[placeholder="Filter options list"]').first().clear().type(profileName);
    cy.wait(2000);
  },

  verifyJobProfileHighlightedInOptionsList(profileName) {
    cy.expect(SelectionList().has({ highlighted: profileName }));
  },

  selectJobProfile(profileName) {
    cy.wait(1000);
    cy.do(SelectionList().select(profileName));
  },

  verifyResetAllButtonEnabled() {
    cy.expect(resetAllButton.has({ disabled: false }));
  },

  verifyLogsFilteredByJobProfile(profileName) {
    cy.expect(
      logsTable.find(MultiColumnListCell({ column: 'Job profile', content: profileName })).exists(),
    );
  },

  clickClearJobProfileFilter() {
    cy.do(jobProfileAccordion.find(jobProfileClearButton).click());
  },

  verifyClearFilterButtonExists(isExist = true) {
    if (isExist) {
      cy.expect(jobProfileAccordion.find(jobProfileClearButton).exists());
    } else {
      cy.expect(jobProfileAccordion.find(jobProfileClearButton).absent());
    }
  },

  verifyJobProfileNotInList() {
    cy.expect(jobProfileSelectionList.find(HTML('-List is empty-')).exists());
  },
};
