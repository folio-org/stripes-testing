import { Button, Accordion, Checkbox, SelectionList, Selection, SearchField, TextField, Section, Select } from '../../../../../interactors';
import FinanceHelper from '../financeHelper';
import getRandomPostfix from '../../../utils/stringTools';

const createdLedgerNameXpath = '//*[@id="paneHeaderpane-ledger-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderledger-results-pane-subtitle"]/span';

const zeroResultsFoundText = '0 records found';
const fiscalYearCss = 'select[name^="fiscalYearOneId"]';


export default {
  defaultUiLedger: {
    name: `autotest_ledger_${getRandomPostfix()}`,
    ledgerStatus: 'Active',
    code: `test_automation_code_${getRandomPostfix()}`,
    description: 'This is ledger created by E2E test automation script'
  },

  waitForLedgerDetailsLoading : () => {
    cy.do(Section({ id: 'pane-ledger-details' }).visible);
  },

  rollover : () => {
    cy.do([
      Button('Actions').click(),
      Button('Rollover').click()
    ]);
  },

  fillInRolloverInfo : (fiscalYear) => {
    cy.do([
      Select({ name: 'toFiscalYearId' }).choose(fiscalYear),
      Checkbox({ name: 'budgetsRollover[0].rolloverAllocation' }).click(),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Expended'),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
      Button('Rollover').click(),
      Button('Continue').click(),
      Button('Confirm').click(),
    ]);
  },

  checkZeroSearchResultsHeader : () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  checkCreatedLedgerName : (ledger) => {
    cy.xpath(createdLedgerNameXpath)
      .should('be.visible')
      .and('have.text', ledger.name);
  },

  createDefaultLedger(defaultLedger) {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(defaultLedger.name),
      TextField('Code*').fillIn(defaultLedger.code),
    ]);
    // TODO: check ability to work through interactors
    cy.get(fiscalYearCss)
      .select(defaultLedger.fiscalYear);
    cy.do(Button('Save & Close').click());
    this.waitForLedgerDetailsLoading();
  },

  resetFilters: () => {
    cy.do(Button({ id: 'reset-ledgers-filters' }).click());
  },

  tryToCreateLedgerWithoutMandatoryFields(ledgerName) {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(ledgerName),
      Button('Save & Close').click(),
      TextField('Code*').fillIn('some code'),
      Button('Save & Close').click(),
      // try to navigate without saving
      Button('Agreements').click(),
      Button('Keep editing').click,
      Button('Cancel').click(),
      Button('Close without saving').click()
    ]);
  },

  deleteLedgerViaActions: () => {
    cy.do([
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-ledger-remove-confirmation-confirm' }).click()
    ]);
  },

  searchByStatusUnitsAndName(status, acquisitionUnitsName, ledgerName) {
    // TODO: check how it can be achieved with interactors
    cy.xpath('//*[@id="accordion-toggle-button-ledgerStatus"]').should('be.visible');
    this.selectStatusInSearch(status);
    cy.do([
      Accordion({ id: 'acqUnitIds' }).clickHeader(),
      Selection({ id: 'acqUnitIds-selection' }).open(),
      SelectionList({ id: 'sl-container-acqUnitIds-selection' }).select(acquisitionUnitsName),
      SearchField({ id: 'input-record-search' }).fillIn(ledgerName),
      Button('Search').click(),
    ]);
  },

  selectStatusInSearch: (ledgerStatus) => {
    cy.do(Accordion({ id: 'ledgerStatus' }).clickHeader());
    switch (ledgerStatus) {
      case FinanceHelper.statusFrozen:
        cy.do(Checkbox({ id: 'clickable-filter-ledgerStatus-frozen' }).click());
        break;
      case FinanceHelper.statusActive:
        cy.do(Checkbox({ id: 'clickable-filter-ledgerStatus-active' }).click());
        break;
      case FinanceHelper.statusInactive:
        cy.do(Checkbox({ id: 'clickable-filter-ledgerStatus-inactive' }).click());
        break;
      default:
        cy.log('No such status like ' + ledgerStatus + '. Please use frozen, active or inactive');
    }
  },

  createViaApi: (ledgersProperties) => {
    return cy
      .okapiRequest({
        path: 'finance/ledgers',
        body: ledgersProperties,
        method: 'POST'
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteledgerViaApi: (ledgerId) => cy.okapiRequest({
    method: 'DELETE',
    path: `finance/ledgers/${ledgerId}`,
    isDefaultSearchParamsRequired: false,
  }),
};
