import uuid from 'uuid';
import {
  Button,
  TextField,
  Pane,
  MultiColumnList,
  PaneContent,
  PaneHeader,
  MultiColumnListCell,
  MultiSelect,
  SelectionOption,
  Link,
  Section,
  TextArea,
  HTML,
  including,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import DateTools from '../../../utils/dateTools';

const createdFiscalYearNameXpath =
  '//*[@id="paneHeaderpane-fiscal-year-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderfiscal-year-results-pane-subtitle"]/span';
const zeroResultsFoundText = '0 records found';
// TODO: move all same buttons to one place related to Finance module
const saveAndClose = Button('Save & Close');
const agreementsButton = Button('Agreements');
const newButton = Button('New');
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const deleteButton = Button('Delete');
const fiscalYearButton = Button('Fiscal year');
const resetButton = Button({ id: 'reset-fiscal-years-filters' });
const fiscalYearFiltersSection = Section({ id: 'fiscal-year-filters-pane' });

export default {
  defaultUiFiscalYear: {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getPreviousDayDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  },

  defaultRolloverFiscalYear: {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCodeForRollover(2000, 9999),
    periodStart: `${DateTools.getPreviousDayDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FYTA',
  },
  getDefaultFiscalYear() {
    return {
      id: uuid(),
      name: `autotest_year_${getRandomPostfix()}`,
      code: DateTools.getRandomFiscalYearCode(2000, 9999),
      currency: 'USD',
      periodStart: `${DateTools.getPreviousDayDateForFiscalYear()}T00:00:00.000+00:00`,
      periodEnd: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
      description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
      series: 'FY',
    };
  },
  selectFisacalYear: (fiscalYear) => {
    cy.do(Pane({ id: 'fiscal-year-results-pane' }).find(Link(fiscalYear)).click());
  },

  waitForFiscalYearDetailsLoading: () => {
    cy.do(Pane({ id: 'pane-fiscal-year-details' }).exists);
  },

  createDefaultFiscalYear(fiscalYear) {
    cy.do([
      newButton.click(),
      TextField('Name*').fillIn(fiscalYear.name),
      TextField('Code*').fillIn(fiscalYear.code),
      TextField({ name: 'periodStart' }).fillIn(fiscalYear.periodBeginDate),
      TextField({ name: 'periodEnd' }).fillIn(fiscalYear.periodEndDate),
      saveAndClose.click(),
    ]);
    this.waitForFiscalYearDetailsLoading();
  },

  checkAvailableBalance(cashBalance, availableBalance) {
    cy.get('div[class*=balanceWrapper-]').then(($element) => {
      const text = $element.text();
      expect(text).to.eq(`Cash balance: ${cashBalance}Available balance: ${availableBalance}`);
    });
  },

  closeThirdPane() {
    cy.do(
      PaneHeader({ id: 'paneHeaderpane-fiscal-year-details' })
        .find(Button({ icon: 'times' }))
        .click(),
    );
  },

  openAcquisitionAccordion() {
    cy.do(Button({ id: 'accordion-toggle-button-acqUnitIds' }).click());
  },

  clickOnFiscalYear: () => {
    cy.do([fiscalYearButton.click()]);
  },

  clickOnLedgerTab: () => {
    cy.do([fiscalYearFiltersSection.find(Button('Ledger')).click()]);
  },

  clickOnGroupTab: () => {
    cy.do([fiscalYearFiltersSection.find(Button('Group')).click()]);
  },

  clickOnFundTab: () => {
    cy.do([fiscalYearFiltersSection.find(Button('Fund')).click()]);
  },

  editFiscalYearDetails: () => {
    cy.wait(6000);
    cy.do(actionsButton.click());
    cy.wait(6000);
    cy.do(editButton.click());
  },

  checkCreatedFiscalYear: (fiscalYearName) => {
    cy.xpath(createdFiscalYearNameXpath).should('be.visible').and('have.text', fiscalYearName);
  },

  filltheStartAndEndDateonCalenderstartDateField: (periodStart, periodEnd) => {
    cy.do([
      TextField({ name: 'periodStart' }).clear(),
      TextField({ name: 'periodStart' }).fillIn(periodStart),
      TextField({ name: 'periodEnd' }).clear(),
      TextField({ name: 'periodEnd' }).fillIn(periodEnd),
      saveAndClose.click(),
    ]);
    cy.wait(6000);
  },

  filltheStartAndEndDateoncalenderstartDateField2: () => {
    cy.do([
      TextField({ name: 'periodStart' }).clear(),
      TextField({ name: 'periodStart' }).fillIn('01/01/2024'),
      TextField({ name: 'periodEnd' }).clear(),
      TextField({ name: 'periodEnd' }).fillIn('12/30/2024'),
      saveAndClose.click(),
    ]);
  },

  tryToCreateFiscalYearWithoutMandatoryFields: (fiscalYearName) => {
    cy.do([
      newButton.click(),
      TextField('Name*').fillIn(fiscalYearName),
      saveAndClose.click(),
      TextField('Code*').fillIn('some code'),
      saveAndClose.click(),
      TextField({ name: 'periodStart' }).fillIn('05/05/2021'),
      saveAndClose.click(),
      // try to navigate without saving
      agreementsButton.click(),
      Button('Keep editing').click(),
      Button('Cancel').click(),
      Button('Close without saving').click(),
    ]);
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  checkSearchResults: (fiscalYear) => {
    cy.expect(
      MultiColumnList({ id: 'fiscal-years-list' }).find(MultiColumnListCell(fiscalYear)).exists(),
    );
  },

  checkSearchResults1: (fiscalYear) => {
    cy.expect(
      MultiColumnList({ id: 'fiscal-years-list' }).find(MultiColumnListCell(fiscalYear)).click(),
    );
  },

  fiscalYearsDisplay: () => {
    cy.expect(MultiColumnList({ id: 'fiscal-years-list' }).exists());
  },

  fiscalYearDetailView: () => {
    cy.expect(PaneContent({ id: 'pane-fiscal-year-details-content' }).exists());
  },

  deleteFiscalYearViaActions: () => {
    cy.do([
      actionsButton.click(),
      deleteButton.click(),
      Button('Delete', { id: 'clickable-fiscal-year-remove-confirmation-confirm' }).click(),
    ]);
  },

  resetFilters: () => {
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true }));
  },

  createViaApi(fiscalYearProperties) {
    return cy
      .okapiRequest({
        path: 'finance/fiscal-years',
        body: fiscalYearProperties,
        method: 'POST',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
  updateFiscalYearViaApi(fiscalYear) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `finance/fiscal-years/${fiscalYear.id}`,
      body: fiscalYear,
    });
  },
  deleteFiscalYearViaApi: (fiscalYearId) => cy.okapiRequest({
    method: 'DELETE',
    path: `finance/fiscal-years/${fiscalYearId}`,
    isDefaultSearchParamsRequired: false,
  }),

  selectFY: (FYName) => {
    cy.wait(4000);
    cy.do(Section({ id: 'fiscal-year-results-pane' }).find(Link(FYName)).click());
  },

  expextFY: (FYName) => {
    cy.expect(Section({ id: 'fiscal-year-results-pane' }).find(Link(FYName)).exists());
  },

  assignAU: (AUName) => {
    cy.wait(6000);
    cy.do([MultiSelect({ id: 'fy-acq-units' }).select(AUName), saveAndClose.click()]);
  },

  editDescription: () => {
    cy.do([TextArea({ name: 'description' }).fillIn('Edited_by_AQA_Team'), saveAndClose.click()]);
  },

  checkNoResultsMessage(absenceMessage) {
    cy.expect(
      Section({ id: 'fiscal-year-results-pane' })
        .find(HTML(including(absenceMessage)))
        .exists(),
    );
  },

  selectAcquisitionUnitFilter(AUName) {
    cy.do([Button({ id: 'acqUnitIds-selection' }).click(), SelectionOption(AUName).click()]);
  },

  clickActionsButtonInFY() {
    cy.do(actionsButton.click());
  },

  clickNewFY() {
    cy.do(newButton.click());
    cy.expect(saveAndClose.is({ disabled: true }));
  },

  checkEditButtonIsDisabled() {
    cy.expect(editButton.is({ disabled: true }));
  },

  checkDeleteButtonIsDisabled() {
    cy.expect(deleteButton.is({ disabled: true }));
  },

  checkAcquisitionUnitIsAbsentToAssign(AUName) {
    cy.do(MultiSelect({ id: 'fy-acq-units' }).open());
    cy.expect(SelectionOption(AUName).absent());
  },
};
