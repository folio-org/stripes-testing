import {
  Button,
  TextField,
  Pane,
  MultiColumnList,
  PaneContent,
  PaneHeader,
  MultiColumnListCell,
  SelectionOption,
  Link,
  Section
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import DateTools from '../../../utils/dateTools';

const createdFiscalYearNameXpath = '//*[@id="paneHeaderpane-fiscal-year-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderfiscal-year-results-pane-subtitle"]/span';
const zeroResultsFoundText = '0 records found';
// TODO: move all same buttons to one place related to Finance module
const saveAndClose = Button('Save & Close');
const agreements = Button('Agreements');
const buttonNew = Button('New');
const actions = Button('Actions');
const edit = Button('Edit');
const deleteButton = Button('Delete');
const fiscalYear = Button('Fiscal year');
const Ledgertab = Button('Ledger');
const resetButton = Button({ id: 'reset-fiscal-years-filters' });
export default {

  defaultUiFiscalYear: {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getPreviousDayDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY'
  },

  defaultRolloverFiscalYear: {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCodeForRollover(2000, 9999),
    periodStart: `${DateTools.getPreviousDayDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FYTA'
  },

  waitForFiscalYearDetailsLoading: () => {
    cy.do(Pane({ id: 'pane-fiscal-year-details' }).exists);
  },

  createDefaultFiscalYear(fiscalYear) {
    cy.do([
      buttonNew.click(),
      TextField('Name*').fillIn(fiscalYear.name),
      TextField('Code*').fillIn(fiscalYear.code),
      TextField({ name: 'periodStart' }).fillIn(fiscalYear.periodBeginDate),
      TextField({ name: 'periodEnd' }).fillIn(fiscalYear.periodEndDate),
      saveAndClose.click()
    ]);
    this.waitForFiscalYearDetailsLoading();
  },

  closeThirdPane() {
    cy.do(PaneHeader({ id: 'paneHeaderpane-fiscal-year-details' }).find(Button({ icon: 'times' })).click());
  },

  openAcquisitionAccordion() {
    cy.do(Button({ id: 'accordion-toggle-button-acqUnitIds' }).click());
  },
  clickOnFiscalYear: () => {
    cy.do([
      fiscalYear.click()
    ]);
  },
  clickOnLedgerTab: () => {
    cy.do([
      Ledgertab.click()
    ]);
  },
  editFiscalYearDetails: () => {
    cy.do([
      actions.click(),
      edit.click()
    ]);
  },

  selectNoAcquisitionUnit() {
    cy.do([Button({ id: 'acqUnitIds-selection' }).click(),
      SelectionOption('No acquisition unit').click(),
    ]);
  },


  checkCreatedFiscalYear: (fiscalYearName) => {
    cy.xpath(createdFiscalYearNameXpath)
      .should('be.visible')
      .and('have.text', fiscalYearName);
  },
  filltheStartAndEndDateoncalenderstartDateField1: () => {
    cy.do([
      TextField({ name: 'periodStart' }).clear(),
      TextField({ name: 'periodStart' }).fillIn('01/01/2022'),
      TextField({ name: 'periodEnd' }).clear(),
      TextField({ name: 'periodEnd' }).fillIn('12/30/2022'),
      saveAndClose.click()
    ]);
  },
  filltheStartAndEndDateoncalenderstartDateField2: () => {
    cy.do([
      TextField({ name: 'periodStart' }).clear(),
      TextField({ name: 'periodStart' }).fillIn('01/01/2024'),
      TextField({ name: 'periodEnd' }).clear(),
      TextField({ name: 'periodEnd' }).fillIn('12/30/2024'),
      saveAndClose.click()
    ]);
  },

  tryToCreateFiscalYearWithoutMandatoryFields: (fiscalYearName) => {
    cy.do([
      buttonNew.click(),
      TextField('Name*').fillIn(fiscalYearName),
      saveAndClose.click(),
      TextField('Code*').fillIn('some code'),
      saveAndClose.click(),
      TextField({ name: 'periodStart' }).fillIn('05/05/2021'),
      saveAndClose.click(),
      // try to navigate without saving
      agreements.click(),
      Button('Keep editing').click(),
      Button('Cancel').click(),
      Button('Close without saving').click()
    ]);
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  checkSearchResults: (fiscalYear) => {
    cy.expect(MultiColumnList({ id: 'fiscal-years-list' })
      .find(MultiColumnListCell(fiscalYear))
      .exists());
  },
  checkSearchResults1: (fiscalYear) => {
    cy.expect(MultiColumnList({ id: 'fiscal-years-list' })
      .find(MultiColumnListCell(fiscalYear)).click());
  },

  fiscalYearsDisplay: () => {
    cy.expect(MultiColumnList({ id: 'fiscal-years-list' }).exists());
  },

  fiscalYearDetailView: () => {
    cy.expect(PaneContent({ id: 'pane-fiscal-year-details-content' }).exists());
  },

  deleteFiscalYearViaActions: () => {
    cy.do([
      actions.click(),
      deleteButton.click(),
      Button('Delete', { id: 'clickable-fiscal-year-remove-confirmation-confirm' }).click()
    ]);
  },

  createViaApi: (fiscalYearProperties) => {
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

  resetFilters: () => {
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true }));
  },

  deleteFiscalYearViaApi: (fiscalYearId) => cy.okapiRequest({
    method: 'DELETE',
    path: `finance/fiscal-years/${fiscalYearId}`,
    isDefaultSearchParamsRequired: false,
  }),

  selectFY: (FYName) => {
    cy.do(Section({ id: 'fiscal-year-results-pane' }).find(Link(FYName)).click());
  },

  expextFY: (FYName) => {
    cy.expect(Section({ id: 'fiscal-year-results-pane' }).find(Link(FYName)).exists());
  },

};
