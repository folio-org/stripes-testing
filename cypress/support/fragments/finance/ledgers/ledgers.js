import uuid from 'uuid';

import {
  Button,
  Accordion,
  Checkbox,
  SelectionList,
  Selection,
  SearchField,
  TextField,
  Section,
  Select,
  Pane,
  Link,
  MultiColumnListCell,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  HTML,
  including,
  Callout,
} from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import getRandomPostfix from '../../../utils/stringTools';
import FinanceHelper from '../financeHelper';
import LedgerDetails from './ledgerDetails';

const createdLedgerNameXpath = '//*[@id="paneHeaderpane-ledger-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderledger-results-pane-subtitle"]/span';
const rolloverButton = Button('Rollover');
const continueButton = Button('Continue');
const confirmButton = Button('Confirm');
const zeroResultsFoundText = '0 records found';
const fiscalYearCss = 'select[name^="fiscalYearOneId"]';
const rolloverConfirmButton = Button({
  id: 'clickable-rollover-confirmation-confirm',
});
const fiscalYearSelect = Select({ name: 'toFiscalYearId' });
const rolloverAllocationCheckbox = Checkbox({
  name: 'budgetsRollover[0].rolloverAllocation',
});
const rolloverBudgetVelueSelect = Select({
  name: 'budgetsRollover[0].rolloverBudgetValue',
});
const addAvailableToSelect = Select({
  name: 'budgetsRollover[0].addAvailableTo',
});
const resetButton = Button({ id: 'reset-ledgers-filters' });
const ledgersFiltersSection = Section({ id: 'ledger-filters-pane' });
const actionsButton = Button('Actions');
const exportSettingsModal = Modal('Export settings');
const expenseClassesSelect = Select({ name: 'expenseClasses' });
const exportButton = Button('Export');
const ledgerResultsPaneSection = Section({ id: 'ledger-results-pane' });
const searchField = SearchField({ id: 'input-record-search' });
const searchButton = Button('Search');
const saveAndClose = Button('Save & close');
const ledgerDetailsSection = Section({ id: 'pane-ledger-details' });

export default {
  defaultUiLedger: {
    name: `autotest_ledger_${getRandomPostfix()}`,
    ledgerStatus: 'Active',
    code: `test_automation_code_${getRandomPostfix()}`,
    description: 'This is ledger created by E2E test automation script',
  },
  getDefaultLedger() {
    return {
      id: uuid(),
      name: `autotest_ledger_${getRandomPostfix()}`,
      ledgerStatus: 'Active',
      code: `test_automation_code_${getRandomPostfix()}`,
      description: 'This is ledger created by E2E test automation script',
    };
  },
  waitForLedgerDetailsLoading: () => {
    cy.do(ledgerDetailsSection.visible);
  },

  clickOnFiscalYearTab: () => {
    cy.do([ledgersFiltersSection.find(Button('Fiscal year')).click()]);
  },

  clickOnGroupTab: () => {
    cy.do([ledgersFiltersSection.find(Button('Group')).click()]);
  },

  clickOnFundTab: () => {
    cy.do([ledgersFiltersSection.find(Button('Fund')).click()]);
  },

  rollover() {
    cy.do([ledgerDetailsSection.find(actionsButton).click(), rolloverButton.click()]);
  },

  exportBudgetInformation: () => {
    cy.do([
      ledgerDetailsSection.find(actionsButton).click(),
      Button('Export budget information (CSV)').click(),
    ]);
  },

  closeRolloverInfo: () => {
    cy.do(Button('Close & view ledger details').click());
  },

  closeOpenedPage: () => {
    cy.do(Button({ icon: 'times' }).click());
  },
  selectFirstCheckBox: (fiscalYear) => {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Expended'),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
      Button('Test rollover').click(),
      continueButton.click(),
      confirmButton.click(),
    ]);
  },
  selectFundInLedger: (fund) => {
    cy.do([
      Section({ id: 'fund' })
        .find(MultiColumnListCell({ content: fund }))
        .click(),
    ]);
  },

  fillInRolloverInfo(fiscalYear) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverAllocationCheckbox.click(),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Expended'),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInclearRolloverInfo(fiscalYear) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    cy.do([fiscalYearSelect.choose(fiscalYear)]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInCommonRolloverInfo(fiscalYear, rolloverBudgetValue, rolloverValueAs) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      Checkbox({ name: 'needCloseBudgets' }).click(),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.wait(6000);
    InteractorsTools.closeAllVisibleCallouts();
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInRolloverInfoBasedOnRolloverEncumbrances(fiscalYear, rolloverBudgetValue) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Expended'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInRolloverInfoForAllExpendedEncumbrances(fiscalYear, rolloverBudgetValue, rolloverValueAs) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Expended'),
      Checkbox({ name: 'encumbrancesRollover[1].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[1].basedOn' }).choose('Expended'),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Expended'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInCommonRolloverInfoWithCloseAllBudgets(fiscalYear, rolloverBudgetValue, rolloverValueAs) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
    cy.wait(4000);
  },

  fillInCommonRolloverInfoWithoutCheckboxOneTimeOrders(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
  ) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      Checkbox({ name: 'restrictEncumbrance' }).click(),
      Checkbox({ name: 'needCloseBudgets' }).click(),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInCommonRolloverInfoWithoutAllocation(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
    returnId = false,
    isTestRollover = false,
  ) {
    if (returnId) {
      cy.intercept('POST', '/finance/ledger-rollovers').as('createRollover');
    }
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);

    if (isTestRollover) {
      cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
      cy.wait(6000);
    } else {
      cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
      cy.wait(4000);
    }

    this.continueRollover();

    if (isTestRollover) {
      cy.do([Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click()]);
    } else {
      cy.do([rolloverConfirmButton.click()]);
    }

    if (returnId) {
      return cy.wait('@createRollover').then((interception) => {
        const rolloverId = interception.response.body.id;
        cy.log(`Ledger Rollover ID: ${rolloverId}`);
        // Wait for rollover to complete processing
        return cy.wait(4000).then(() => rolloverId);
      });
    }
    return cy.wrap(undefined);
  },

  fillInCommonRolloverInfoWithoutCheckboxOngoingEncumbrances(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
  ) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      Checkbox({ name: 'needCloseBudgets' }).click(),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInCommonRolloverInfoWithoutCheckboxOngoingEncumbrancesLimits(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
  ) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      Checkbox({ name: 'restrictEncumbrance' }).click(),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  continueRollover: () => {
    cy.wait(4000);
    cy.get('body').then(($body) => {
      if ($body.find('[id=unpaid-invoice-list-modal]').length) {
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.do([Modal({ id: 'unpaid-invoice-list-modal' }).find(Button('Continue')).click()]);
      } else {
        // do nothing if modal is not displayed
      }
    });
  },
  clickRollover: () => {
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
  },
  clickonViewledgerDetails: () => {
    cy.do([Button('Close & view ledger details').click()]);
  },
  resetAll() {
    cy.do(Button('Reset all').click());
  },

  fillInRolloverForCashBalance(fiscalYear, rolloverBudgetValue, rolloverValueAs) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInRolloverForCashBalanceWithoutAllocations(fiscalYear, rolloverBudgetValue, rolloverValueAs) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  selectFund: () => {
    cy.do(
      Section({ id: 'fund' })
        .find(MultiColumnListRow({ index: 0 }))
        .click(),
    );
  },
  selectSecondFund: () => {
    cy.do(
      Section({ id: 'fund' })
        .find(MultiColumnListRow({ index: 1 }))
        .click(),
    );
  },

  fillInRolloverForCashBalanceWithNotActiveAllocation(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
  ) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInTestRolloverInfoCashBalance(fiscalYear, rolloverBudgetValue, rolloverValueAs) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      Select({ name: 'toFiscalYearId' }).choose(fiscalYear),
      Checkbox({ name: 'budgetsRollover[0].rolloverAllocation' }).click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
    ]);
    cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click()]);
  },

  fillInTestRolloverInfoOnlyTransferCashBalance(fiscalYear, rolloverBudgetValue, rolloverValueAs) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      Select({ name: 'toFiscalYearId' }).choose(fiscalYear),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
    ]);
    cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click()]);
  },

  fillInTestRolloverInfoForOngoingOrdersWithoutAllocations(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
  ) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      Select({ name: 'toFiscalYearId' }).choose(fiscalYear),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
    cy.wait(2000);
    this.continueRollover();
    cy.do([Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click()]);
  },

  fillInTestRolloverInfoForOngoingOrdersWithAllocations(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
    basedOn,
  ) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      Select({ name: 'toFiscalYearId' }).choose(fiscalYear),
      Checkbox({ name: 'budgetsRollover[0].rolloverAllocation' }).click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose(basedOn),
    ]);
    cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
    cy.wait(2000);
    this.continueRollover();
    cy.do([Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click()]);
  },

  fillInRolloverInfoForOngoingOrdersWithoutAllocations(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
  ) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      Select({ name: 'toFiscalYearId' }).choose(fiscalYear),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do(rolloverConfirmButton.click());
  },

  fillInRolloverInfoForOngoingOrdersWithAllocations(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
    basedOn,
  ) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      Select({ name: 'toFiscalYearId' }).choose(fiscalYear),
      Checkbox({ name: 'budgetsRollover[0].rolloverAllocation' }).click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose(basedOn),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do(rolloverConfirmButton.click());
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  checkCreatedLedgerName: (ledger) => {
    cy.xpath(createdLedgerNameXpath).should('be.visible').and('have.text', ledger.name);
  },

  createDefaultLedger(defaultLedger) {
    cy.do([
      actionsButton.click(),
      Button('New').click(),
      TextField('Name*').fillIn(defaultLedger.name),
      TextField('Code*').fillIn(defaultLedger.code),
    ]);
    // TODO: check ability to work through interactors
    cy.get(fiscalYearCss).select(defaultLedger.fiscalYear);
    cy.do(saveAndClose.click());
    this.waitForLedgerDetailsLoading();
  },

  createLedgerWithAcquisitionUnit(ledger, acquisitionUnitName) {
    cy.do([
      actionsButton.click(),
      Button('New').click(),
      TextField('Name*').fillIn(ledger.name),
      TextField('Code*').fillIn(ledger.code),
    ]);
    cy.get(fiscalYearCss).select(ledger.fiscalYearOneId);
    cy.wait(2000);
    cy.get('[id*="downshift"][id*="toggle-button"]').click();
    cy.wait(500);
    cy.contains('[id*="downshift"][id*="item"]', acquisitionUnitName).click();
    cy.wait(1000);
    cy.do(saveAndClose.click());
    cy.wait(2000);
    this.waitForLedgerDetailsLoading();
  },

  createLedgerWithAcquisitionUnitAndCaptureId(ledger, acquisitionUnitName) {
    cy.intercept('POST', '**/finance/ledgers*').as('createLedgerRequest');

    this.createLedgerWithAcquisitionUnit(ledger, acquisitionUnitName);

    return cy.wait('@createLedgerRequest').then((interception) => {
      ledger.id = interception.response.body.id;
      return ledger;
    });
  },

  resetFilters: () => {
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true }));
  },

  tryToCreateLedgerWithoutMandatoryFields(ledgerName) {
    cy.do([
      actionsButton.click(),
      Button('New').click(),
      TextField('Name*').fillIn(ledgerName),
      saveAndClose.click(),
      TextField('Code*').fillIn('some code'),
      saveAndClose.click(),
      // try to navigate without saving
      Button('Agreements').click(),
      Button('Keep editing').click(),
      Button('Cancel').click(),
      Button('Close without saving').click(),
    ]);
  },

  deleteLedgerViaActions() {
    cy.wait(4000);
    cy.do(ledgerDetailsSection.find(actionsButton).click());
    cy.wait(500);
    cy.do(Button('Delete').click());
    cy.wait(500);
    cy.do(Button('Delete', { id: 'clickable-ledger-remove-confirmation-confirm' }).click());
    cy.wait(500);
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
        method: 'POST',
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteLedgerViaApi: (ledgerId, failOnStatusCode) => cy.okapiRequest({
    method: 'DELETE',
    path: `finance/ledgers/${ledgerId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode,
  }),

  selectLedger: (ledgerName) => {
    cy.wait(4000);
    cy.do(Pane({ id: 'ledger-results-pane' }).find(Link(ledgerName)).click());
    LedgerDetails.waitLoading();
    cy.wait(4000);
    return LedgerDetails;
  },

  selectLedgerAfterRollover: (ledgerName) => {
    cy.wait(4000);
    cy.do(Pane({ id: 'ledger-results-pane' }).find(Link(ledgerName)).click());
    LedgerDetails.waitForLoadingLedgerDetailAfterRollover();
    cy.wait(4000);
    return LedgerDetails;
  },

  rolloverLogs() {
    cy.do([ledgerDetailsSection.find(actionsButton).click(), Button('Rollover logs').click()]);
  },

  checkFinancialSummeryQuality: (quantityValue1, quantityValue2) => {
    cy.expect(
      Section({ id: 'financial-summary' })
        .find(HTML(including('Cash balance: ' + quantityValue1)))
        .exists(),
    );
    cy.expect(
      Section({ id: 'financial-summary' })
        .find(HTML(including('Available balance: ' + quantityValue2)))
        .exists(),
    );
  },

  exportRollover: (dataFile) => {
    cy.wait(6000);
    cy.contains('#rollover-logs-list div[role="gridcell"] a', `${dataFile}-result`).click();
  },

  exportRolloverError: (dataFile) => {
    cy.wait(4000);
    cy.contains('#rollover-logs-list div[role="gridcell"] a', `${dataFile}-error`).click();
  },

  checkRolloverLogs: (dataFile) => {
    cy.expect([
      MultiColumnList({ id: 'rollover-logs-list' })
        .find(MultiColumnListCell('Successful'))
        .exists(),
    ]);
    cy.contains('#rollover-logs-list div[role="gridcell"] a', `${dataFile}-result`);
    cy.contains('#rollover-logs-list div[role="gridcell"] a', `${dataFile}-settings`);
  },

  checkDownloadedFile(
    fileName,
    fund,
    secondFiscalYear,
    allowableEncumbrance,
    allowableExpenditure,
    initialAllocation,
    totalAllocation,
    totalFunding,
    cashBalance,
    available,
  ) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(6000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(
        '"Name (Fund)","Code (Fund)","Status (Fund)","Type","Group (Code)","Acquisition unit","Transfer from","Transfer to","External account number","Description","Name (Budget)","Status (Budget)","Allowable encumbrance","Allowable expenditure","Initial allocation","Increase","Decrease","Total allocation","Transfers","Total Funding","Encumbered (Budget)","Awaiting payment (Budget)","Expended (Budget)","Credited (Budget)","Unavailable","Over encumbered","Over expended","Cash balance","Available","Name (Exp Class)","Code (Exp Class)","Status (Exp Class)","Encumbered (Exp Class)","Awaiting payment (Exp Class)","Expended (Exp Class)","Credited (Exp Class)","Percentage of total expended"',
      );

      const actualData = fileRows[1].trim().split(',');
      expect(actualData[0]).to.equal(`"${fund.name}"`);
      expect(actualData[1]).to.equal(`"${fund.code}"`);
      expect(actualData[9]).to.equal(`"${fund.description}"`);
      expect(actualData[10]).to.equal(`"${fund.code}-${secondFiscalYear.code}"`);
      expect(actualData[12]).to.equal(allowableEncumbrance);
      expect(actualData[13]).to.equal(allowableExpenditure);
      expect(actualData[14]).to.equal(initialAllocation);
      expect(actualData[17]).to.equal(totalAllocation);
      expect(actualData[19]).to.equal(totalFunding);
      expect(actualData[27]).to.equal(cashBalance);
      expect(actualData[28]).to.equal(available);
    });
  },

  checkDownloadedFileWithAllTansactions(
    fileName,
    fund,
    secondFiscalYear,
    allowableEncumbrance,
    allowableExpenditure,
    initialAllocation,
    increase,
    decrease,
    totalAllocation,
    transfers,
    totalFunding,
    encumberedBudget,
    awaitingPaymentBudget,
    expendedBudget,
    unavailable,
    overEncumbered,
    overExpended,
    cashBalance,
    available,
  ) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(6000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(
        '"Name (Fund)","Code (Fund)","Status (Fund)","Type","Group (Code)","Acquisition unit","Transfer from","Transfer to","External account number","Description","Name (Budget)","Status (Budget)","Allowable encumbrance","Allowable expenditure","Initial allocation","Increase","Decrease","Total allocation","Transfers","Total Funding","Encumbered (Budget)","Awaiting payment (Budget)","Expended (Budget)","Credited (Budget)","Unavailable","Over encumbered","Over expended","Cash balance","Available","Name (Exp Class)","Code (Exp Class)","Status (Exp Class)","Encumbered (Exp Class)","Awaiting payment (Exp Class)","Expended (Exp Class)","Credited (Exp Class)","Percentage of total expended"',
      );

      const actualData = fileRows[1].trim().split(',');
      expect(actualData[0]).to.equal(`"${fund.name}"`);
      expect(actualData[1]).to.equal(`"${fund.code}"`);
      expect(actualData[9]).to.equal(`"${fund.description}"`);
      expect(actualData[10]).to.equal(`"${fund.code}-${secondFiscalYear.code}"`);
      expect(actualData[12]).to.equal(allowableEncumbrance);
      expect(actualData[13]).to.equal(allowableExpenditure);
      expect(actualData[14]).to.equal(initialAllocation);
      expect(actualData[15]).to.equal(increase);
      expect(actualData[16]).to.equal(decrease);
      expect(actualData[17]).to.equal(totalAllocation);
      expect(actualData[18]).to.equal(transfers);
      expect(actualData[19]).to.equal(totalFunding);
      expect(actualData[20]).to.equal(encumberedBudget);
      expect(actualData[21]).to.equal(awaitingPaymentBudget);
      expect(actualData[22]).to.equal(expendedBudget);
      expect(actualData[24]).to.equal(unavailable);
      expect(actualData[25]).to.equal(overEncumbered);
      expect(actualData[26]).to.equal(overExpended);
      expect(actualData[27]).to.equal(cashBalance);
      expect(actualData[28]).to.equal(available);
    });
  },

  checkDownloadedErrorFile({
    fileName,
    ledgerRolloverId,
    errorType,
    failedAction,
    errorMessage,
    amount,
    fundId,
    fundCode,
    orderId,
    orderLineNumber,
    orderLineId,
  }) {
    cy.wait(3000);
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      const [headerLine, dataLine] = fileContent.trim().split(/\r?\n/);

      const header = this.parseCsvLine(headerLine).map((s) => s.replace(/^"|"$/g, ''));
      header[0] = header[0].replace(/^\uFEFF/, '');

      const EXPECTED_HEADER = [
        'Ledger rollover ID',
        'Error type',
        'Failed action',
        'Error message',
        'Amount',
        'Fund ID',
        'Fund code',
        'Purchase order ID',
        'Purchase order line number',
        'Purchase order line ID',
      ];

      expect(header).to.deep.equal(EXPECTED_HEADER);

      const row = this.parseCsvLine(dataLine).map((s) => s.replace(/^"|"$/g, ''));
      expect(row[0]).to.equal(ledgerRolloverId);
      expect(row[1]).to.equal(errorType);
      expect(row[2]).to.equal(failedAction);
      expect(row[3]).to.equal(errorMessage);
      expect(row[4]).to.equal(amount);
      expect(row[5]).to.equal(fundId);
      if (fundCode) {
        expect(row[6]).to.equal(fundCode);
      }
      expect(row[7]).to.equal(orderId);
      if (orderLineNumber) {
        expect(row[8]).to.equal(orderLineNumber);
      }
      expect(row[9]).to.equal(orderLineId);
    });
  },

  deleteDownloadedFile(fileName) {
    cy.wait(6000);
    const filePath = `cypress\\downloads\\${fileName}`;
    cy.exec(`del "${filePath}"`, { failOnNonZeroExit: false });
  },

  fillInTestRolloverInfoCashBalanceWithNotActiveAllocation(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
  ) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.do([
      Select({ name: 'toFiscalYearId' }).choose(fiscalYear),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
    ]);
    cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
    cy.wait(2000);
    this.continueRollover();
    cy.do([Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click()]);
  },

  fillInRolloverData(
    fiscalYear,
    restrictEncumbrance = false,
    restrictExpenditures = false,
    needCloseBudgets = false,
    rolloverAllocation = false,
    rolloverAdjustAllocation = false,
    rolloverBudgetValue = false,
    rolloverValueAs = false,
    setAllowances = false,
    allowedEncumbrance = false,
    allowedExpenditure = false,
    ongoingEncumbrances = false,
    ongoingEncumbrancesBasedOn = false,
    ongoingEncumbrancesIncreaseBy = false,
    ongoingSubscriptionEncumbrances = false,
    ongoingSubscriptionEncumbrancesBasedOn = false,
    ongoingSubscriptionEncumbrancesIncreaseBy = false,
    oneTimeEncumbrances = false,
    oneTimeEncumbrancesBasedOn = false,
    oneTimeEncumbrancesIncreaseBy = false,
  ) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    cy.do(fiscalYearSelect.choose(fiscalYear));
    if (restrictEncumbrance === true) {
      cy.do(Checkbox({ name: 'restrictEncumbrance' }).click());
    }
    if (restrictExpenditures === true) {
      cy.do(Checkbox({ name: 'restrictExpenditures' }).click());
    }
    if (needCloseBudgets === true) {
      cy.do(Checkbox({ name: 'needCloseBudgets' }).click());
    }
    if (rolloverAllocation === true) {
      cy.do(rolloverAllocationCheckbox.click());
    }
    if (rolloverAdjustAllocation === true) {
      cy.do(
        TextField({ name: 'budgetsRollover[0].adjustAllocation' }).fillIn(rolloverAdjustAllocation),
      );
    }
    if (rolloverBudgetValue === true) {
      cy.do(rolloverBudgetVelueSelect.choose(rolloverBudgetValue));
    }
    if (rolloverValueAs === true) {
      cy.do(addAvailableToSelect.choose(rolloverValueAs));
    }
    if (setAllowances === true) {
      cy.do(Checkbox({ name: 'budgetsRollover[0].setAllowances' }).click());
    }
    if (allowedEncumbrance === true) {
      cy.do(
        TextField({ name: 'budgetsRollover[0].allowableEncumbrance' }).fillIn(allowedEncumbrance),
      );
    } else {
      cy.expect(
        TextField({ name: 'budgetsRollover[0].allowableEncumbrance' }).is({ disabled: true }),
      );
    }
    if (allowedExpenditure === true) {
      cy.do(
        TextField({ name: 'budgetsRollover[0].allowableExpenditure' }).fillIn(allowedExpenditure),
      );
    } else {
      cy.expect(
        TextField({ name: 'budgetsRollover[0].allowableExpenditure' }).is({ disabled: true }),
      );
    }
    if (ongoingEncumbrances === true) {
      cy.do([
        Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
        Select({ name: 'encumbrancesRollover[0].basedOn' }).choose(ongoingEncumbrancesBasedOn),
      ]);
    } else {
      cy.expect(Select({ name: 'encumbrancesRollover[0].basedOn' }).is({ disabled: true }));
    }
    if (ongoingEncumbrancesIncreaseBy === true) {
      cy.do(
        TextField({ name: 'encumbrancesRollover[0].increaseBy' }).fillIn(
          ongoingEncumbrancesIncreaseBy,
        ),
      );
    } else {
      cy.expect(TextField({ name: 'encumbrancesRollover[0].increaseBy' }).is({ disabled: true }));
    }
    if (ongoingSubscriptionEncumbrances === true) {
      cy.do([
        Checkbox({ name: 'encumbrancesRollover[1].rollover' }).click(),
        Select({ name: 'encumbrancesRollover[1].basedOn' }).choose(
          ongoingSubscriptionEncumbrancesBasedOn,
        ),
      ]);
    } else {
      cy.expect(Select({ name: 'encumbrancesRollover[1].basedOn' }).is({ disabled: true }));
    }
    if (ongoingSubscriptionEncumbrancesIncreaseBy === true) {
      cy.do(
        TextField({ name: 'encumbrancesRollover[1].increaseBy' }).fillIn(
          ongoingSubscriptionEncumbrancesIncreaseBy,
        ),
      );
    } else {
      cy.expect(TextField({ name: 'encumbrancesRollover[1].increaseBy' }).is({ disabled: true }));
    }
    if (oneTimeEncumbrances === true) {
      cy.do([
        Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
        Select({ name: 'encumbrancesRollover[2].basedOn' }).choose(oneTimeEncumbrancesBasedOn),
      ]);
    } else {
      cy.expect(Select({ name: 'encumbrancesRollover[2].basedOn' }).is({ disabled: true }));
    }
    if (oneTimeEncumbrancesIncreaseBy === true) {
      cy.do(
        TextField({ name: 'encumbrancesRollover[2].increaseBy' }).fillIn(
          oneTimeEncumbrancesIncreaseBy,
        ),
      );
    } else {
      cy.expect(TextField({ name: 'encumbrancesRollover[2].increaseBy' }).is({ disabled: true }));
    }
  },

  clickRolloverAfterFillinData() {
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInRolloverWithoutCheckboxCloseBudgetsOneTimeOrders(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
  ) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      Checkbox({ name: 'needCloseBudgets' }).click(),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInRolloverForOneTimeOrdersWithAllocation(fiscalYear, rolloverBudgetValue, rolloverValueAs) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInRolloverForOneTimeOrdersWithAllocationRemaining(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
  ) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Remaining'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInRolloverWithAllocation(fiscalYear, rolloverBudgetValue, rolloverValueAs) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInRolloverForOneTimeOrdersWithoutBudgets(fiscalYear) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInTestRolloverForOneTimeOrdersWithAllocation(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
    returnId = false,
  ) {
    if (returnId) {
      cy.intercept('POST', '/finance/ledger-rollovers').as('createRollover');
    }
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click()]);
    if (returnId) {
      return cy.wait('@createRollover').then((interception) => {
        const rolloverId = interception.response.body.id;
        cy.log(`Ledger Rollover ID: ${rolloverId}`);
        // Wait for rollover to complete processing
        return cy.wait(4000).then(() => rolloverId);
      });
    }
    return cy.wrap(undefined);
  },

  fillInRolloverForOneTimeOrdersWithAllocationAndWithoutCloseBudgets(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
    restrictEncumbrance = false,
    restrictExpenditures = false,
  ) {
    cy.wait(2000);
    cy.do(fiscalYearSelect.click());
    cy.wait(2000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do(fiscalYearSelect.choose(fiscalYear));
    if (restrictEncumbrance === true) {
      cy.do(Checkbox({ name: 'restrictEncumbrance' }).click());
    }
    if (restrictExpenditures === true) {
      cy.do(Checkbox({ name: 'restrictExpenditures' }).click());
    }
    cy.do([
      Checkbox({ name: 'needCloseBudgets' }).click(),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Rollover")').eq(2).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInTestRolloverForOneTimeOrdersWithAllocationAndWithoutCloseBudgets(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
    returnId = false,
  ) {
    if (returnId) {
      cy.intercept('POST', '/finance/ledger-rollovers').as('createRollover');
    }
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      Checkbox({ name: 'needCloseBudgets' }).click(),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click()]);
    if (returnId) {
      return cy.wait('@createRollover').then((interception) => {
        const rolloverId = interception.response.body.id;
        cy.log(`Ledger Rollover ID: ${rolloverId}`);
        // Wait for rollover to complete processing
        return cy.wait(4000).then(() => rolloverId);
      });
    }
    return cy.wrap(undefined);
  },

  fillInTestRolloverAndVarifyErrorForOneTimeOrdersWithAllocation(
    secondFiscalYear,
    rolloverBudgetValue,
    rolloverValueAs,
    ledger,
    firstFiscalYear,
  ) {
    cy.wait(4000);
    cy.do(fiscalYearSelect.click());
    cy.wait(4000);
    // Need to wait,while date of fiscal year will be loaded
    cy.do([
      fiscalYearSelect.choose(secondFiscalYear),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelueSelect.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
    InteractorsTools.checkCalloutErrorMessage(
      `${ledger.name} was already rolled over from the fiscal year ${firstFiscalYear} to the fiscal year ${secondFiscalYear}`,
    );
  },

  prepareExportSettings(fiscalYear, exportExpenseclasses, ledger) {
    cy.wait(4000);
    cy.do([
      exportSettingsModal.find(Select({ name: 'fiscalYearId' })).choose(fiscalYear),
      exportSettingsModal.find(expenseClassesSelect).choose(exportExpenseclasses),
      exportSettingsModal.find(exportButton).click(),
    ]);
    cy.wait(2000);
    InteractorsTools.checkCalloutMessage(`Export of ${ledger.name} data has started`);
    cy.wait(2000);
    InteractorsTools.checkCalloutMessage(`${ledger.name} data was successfully exported to CSV`);
  },

  closeAllVisibleCallouts: () => {
    cy.get('[class^=calloutBase-]').then(($callouts) => {
      if (!$callouts.length) return;
      for (let i = 0; i < $callouts.length; i++) {
        cy.do(
          Callout({ id: $callouts[i].id })
            .find(Button({ icon: 'times' }))
            .click(),
        );
      }
    });
  },

  checkPreparationExportSettings() {
    cy.wait(4000);
    cy.do([
      exportSettingsModal.find(Select({ name: 'fiscalYearId' })).choose(''),
      exportSettingsModal.find(expenseClassesSelect).choose('All'),
    ]);
    cy.expect(exportSettingsModal.find(exportButton).is({ disabled: true }));
    cy.do(exportSettingsModal.find(expenseClassesSelect).choose('Active'));
    cy.expect(exportSettingsModal.find(exportButton).is({ disabled: true }));
    cy.do(exportSettingsModal.find(expenseClassesSelect).choose('Inactive'));
    cy.expect(exportSettingsModal.find(exportButton).is({ disabled: true }));
    cy.do(exportSettingsModal.find(expenseClassesSelect).choose('None'));
    cy.expect(exportSettingsModal.find(exportButton).is({ disabled: true }));
  },

  checkColumnNamesInDownloadedLedgerExportFile(fileName) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(
        '"Name (Fund)","Code (Fund)","Status (Fund)","Type","Group (Code)","Acquisition unit","Transfer from","Transfer to","External account number","Description","Name (Budget)","Status (Budget)","Allowable encumbrance","Allowable expenditure","Date created (Budget)","Initial allocation","Increase","Decrease","Total allocation","Transfers","Total Funding","Encumbered (Budget)","Awaiting payment (Budget)","Expended (Budget)","Unavailable","Over encumbered","Over expended","Cash balance","Available"',
      );
    });
  },

  checkColumnNamesInDownloadedLedgerExportFileForNone(fileName) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(
        '"Name (Fund)","Code (Fund)","Status (Fund)","Type","Group (Code)","Acquisition unit","Transfer from","Transfer to","External account number","Description","Name (Budget)","Status (Budget)","Allowable encumbrance","Allowable expenditure","Date created (Budget)","Initial allocation","Increase","Decrease","Total allocation","Transfers","Total Funding","Encumbered (Budget)","Awaiting payment (Budget)","Expended (Budget)","Credited (Budget)","Unavailable","Over encumbered","Over expended","Cash balance","Available"',
      );
    });
  },

  checkColumnNamesInDownloadedLedgerExportFileWithExpClasses(fileName) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(
        '"Name (Fund)","Code (Fund)","Status (Fund)","Type","Group (Code)","Acquisition unit","Transfer from","Transfer to","External account number","Description","Name (Budget)","Status (Budget)","Allowable encumbrance","Allowable expenditure","Date created (Budget)","Initial allocation","Increase","Decrease","Total allocation","Transfers","Total Funding","Encumbered (Budget)","Awaiting payment (Budget)","Expended (Budget)","Credited (Budget)","Unavailable","Over encumbered","Over expended","Cash balance","Available","Name (Exp Class)","Code (Exp Class)","Status (Exp Class)","Encumbered (Exp Class)","Awaiting payment (Exp Class)","Expended (Exp Class)","Credited (Exp Class)","Percentage of total expended"',
      );
    });
  },

  checkColumnNamesInDownloadedLedgerAllocationWorksheet(fileName) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(
        '"Fiscal year","Fund name","Fund code","Fund UUID","Fund status","Budget name","Budget UUID","Budget status","Budget initial allocation","Budget current allocation","Budget allowable expenditure","Budget allowable encumbrance","Allocation adjustment","Transaction tag","Transaction description"',
      );
    });
  },

  checkColumnContentInDownloadedLedgerExportFile(
    fileName,
    fileRow,
    fund,
    secondFiscalYear,
    allowableEncumbrance,
    allowableExpenditure,
    initialAllocation,
    increase,
    decrease,
    totalAllocation,
    transfers,
    totalFunding,
    encumberedBudget,
    awaitingPaymentBudget,
    expendedBudget,
    unavailable,
    overEncumbered,
    overExpended,
    cashBalance,
    available,
  ) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      const actualData = fileRows[fileRow].trim().split(',');
      expect(actualData[0]).to.equal(`"${fund.name}"`);
      expect(actualData[1]).to.equal(`"${fund.code}"`);
      expect(actualData[9]).to.equal(`"${fund.description}"`);
      expect(actualData[10]).to.equal(`"${fund.code}-${secondFiscalYear.code}"`);
      expect(actualData[12]).to.equal(allowableEncumbrance);
      expect(actualData[13]).to.equal(allowableExpenditure);
      expect(actualData[16]).to.equal(initialAllocation);
      expect(actualData[17]).to.equal(increase);
      expect(actualData[18]).to.equal(decrease);
      expect(actualData[19]).to.equal(totalAllocation);
      expect(actualData[20]).to.equal(transfers);
      expect(actualData[21]).to.equal(totalFunding);
      expect(actualData[22]).to.equal(encumberedBudget);
      expect(actualData[23]).to.equal(awaitingPaymentBudget);
      expect(actualData[24]).to.equal(expendedBudget);
      expect(actualData[25]).to.equal(unavailable);
      expect(actualData[26]).to.equal(overEncumbered);
      expect(actualData[27]).to.equal(overExpended);
      expect(actualData[28]).to.equal(cashBalance);
      expect(actualData[29]).to.equal(available);
    });
  },

  checkColumnContentInDownloadedLedgerExportFileForNone(
    fileName,
    fileRow,
    fund,
    secondFiscalYear,
    allowableEncumbrance,
    allowableExpenditure,
    initialAllocation,
    increase,
    decrease,
    totalAllocation,
    transfers,
    totalFunding,
    encumberedBudget,
    awaitingPaymentBudget,
    expendedBudget,
    unavailable,
    overEncumbered,
    overExpended,
    cashBalance,
    available,
  ) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      const actualData = fileRows[fileRow].trim().split(',');
      expect(actualData[0]).to.equal(`"${fund.name}"`);
      expect(actualData[1]).to.equal(`"${fund.code}"`);
      expect(actualData[9]).to.equal(`"${fund.description}"`);
      expect(actualData[10]).to.equal(`"${fund.code}-${secondFiscalYear.code}"`);
      expect(actualData[12]).to.equal(allowableEncumbrance);
      expect(actualData[13]).to.equal(allowableExpenditure);
      expect(actualData[16]).to.equal(initialAllocation);
      expect(actualData[17]).to.equal(increase);
      expect(actualData[18]).to.equal(decrease);
      expect(actualData[19]).to.equal(totalAllocation);
      expect(actualData[20]).to.equal(transfers);
      expect(actualData[21]).to.equal(totalFunding);
      expect(actualData[22]).to.equal(encumberedBudget);
      expect(actualData[23]).to.equal(awaitingPaymentBudget);
      expect(actualData[24]).to.equal(expendedBudget);
      expect(actualData[26]).to.equal(unavailable);
      expect(actualData[27]).to.equal(overEncumbered);
      expect(actualData[28]).to.equal(overExpended);
      expect(actualData[29]).to.equal(cashBalance);
      expect(actualData[30]).to.equal(available);
    });
  },

  checkColumnContentInDownloadedLedgerExportFileWithExpClasses(
    fileName,
    fileRow,
    fund,
    secondFiscalYear,
    allowableEncumbrance,
    allowableExpenditure,
    initialAllocation,
    increase,
    decrease,
    totalAllocation,
    transfers,
    totalFunding,
    encumberedBudget,
    awaitingPaymentBudget,
    expendedBudget,
    unavailable,
    overEncumbered,
    overExpended,
    cashBalance,
    available,
    expClassName,
    expClassCode,
    expClassStatus,
    expClassEncumbered,
    expClassAwaitingPayment,
    expClassExpended,
  ) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      const actualData = fileRows[fileRow].trim().split(',');
      expect(actualData[0]).to.equal(`"${fund.name}"`);
      expect(actualData[1]).to.equal(`"${fund.code}"`);
      expect(actualData[9]).to.equal(`"${fund.description}"`);
      expect(actualData[10]).to.equal(`"${fund.code}-${secondFiscalYear.code}"`);
      expect(actualData[12]).to.equal(allowableEncumbrance);
      expect(actualData[13]).to.equal(allowableExpenditure);
      expect(actualData[16]).to.equal(initialAllocation);
      expect(actualData[17]).to.equal(increase);
      expect(actualData[18]).to.equal(decrease);
      expect(actualData[19]).to.equal(totalAllocation);
      expect(actualData[20]).to.equal(transfers);
      expect(actualData[21]).to.equal(totalFunding);
      expect(actualData[22]).to.equal(encumberedBudget);
      expect(actualData[23]).to.equal(awaitingPaymentBudget);
      expect(actualData[24]).to.equal(expendedBudget);
      expect(actualData[26]).to.equal(unavailable);
      expect(actualData[27]).to.equal(overEncumbered);
      expect(actualData[28]).to.equal(overExpended);
      expect(actualData[29]).to.equal(cashBalance);
      expect(actualData[30]).to.equal(available);
      expect(actualData[31]).to.equal(`"${expClassName}"`);
      expect(actualData[32]).to.equal(`"${expClassCode}"`);
      expect(actualData[33]).to.equal(`"${expClassStatus}"`);
      expect(actualData[34]).to.equal(expClassEncumbered);
      expect(actualData[35]).to.equal(expClassAwaitingPayment);
      expect(actualData[36]).to.equal(expClassExpended);
    });
  },

  checkColumnContentInDownloadedLedgerExportFileWithoutBudgets(fileName, fileRow, fund) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      const actualData = fileRows[fileRow].trim().split(',');
      expect(actualData[0]).to.equal(`"${fund.name}"`);
      expect(actualData[1]).to.equal(`"${fund.code}"`);
      expect(actualData[9]).to.equal(`"${fund.description}"`);
      expect(actualData[10]).to.equal('"No budget found"');
    });
  },

  checkLedgerExportRow(fileName, matcher, expected) {
    cy.readFile(`cypress/downloads/${fileName}`, { log: false }).then((fileContent) => {
      const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const header = this.parseCsvLine(lines[0]);
      const cell = (rowArr, colName) => {
        const idx = header.indexOf(colName);
        return this.clean(rowArr[idx]);
      };

      let targetIndex;
      if (typeof matcher?.rowIndex === 'number') {
        targetIndex = matcher.rowIndex;
      } else if (matcher?.fundName) {
        const fundNameCol = header.indexOf('Fund name');
        targetIndex = lines.findIndex((l, i) => {
          if (i === 0) return false;
          const arr = this.parseCsvLine(l);
          return this.clean(arr[fundNameCol]) === this.clean(matcher.fundName);
        });
      }

      const row = this.parseCsvLine(lines[targetIndex]);
      if (expected.fiscalYear != null) {
        expect(cell(row, 'Fiscal year')).to.equal(this.clean(expected.fiscalYear));
      }
      if (expected.fundName != null) {
        expect(cell(row, 'Fund name')).to.equal(this.clean(expected.fundName));
      }
      if (expected.fundCode != null) {
        expect(cell(row, 'Fund code')).to.equal(this.clean(expected.fundCode));
      }
      if (expected.fundUUID != null) {
        expect(cell(row, 'Fund UUID')).to.equal(this.clean(expected.fundUUID));
      }
      if (expected.fundStatus != null) {
        expect(cell(row, 'Fund status')).to.equal(this.clean(expected.fundStatus));
      }
      if (expected.budgetName != null) {
        expect(cell(row, 'Budget name')).to.equal(this.clean(expected.budgetName));
      }
      if (expected.budgetUUID != null) {
        expect(cell(row, 'Budget UUID')).to.equal(this.clean(expected.budgetUUID));
      }
      if (expected.budgetStatus != null) {
        expect(cell(row, 'Budget status')).to.equal(this.clean(expected.budgetStatus));
      }
      if (expected.budgetInitialAllocation != null) {
        expect(cell(row, 'Budget initial allocation')).to.equal(
          this.clean(expected.budgetInitialAllocation),
        );
      }
      if (expected.budgetCurrentAllocation != null) {
        expect(cell(row, 'Budget current allocation')).to.equal(
          this.clean(expected.budgetCurrentAllocation),
        );
      }
      if (expected.budgetAllowableEncumbrance != null) {
        expect(cell(row, 'Budget allowable encumbrance')).to.equal(
          this.clean(expected.budgetAllowableEncumbrance),
        );
      }
      if (expected.budgetAllowableExpenditure != null) {
        expect(cell(row, 'Budget allowable expenditure')).to.equal(
          this.clean(expected.budgetAllowableExpenditure),
        );
      }
      if (expected.allocationAdjustment != null) {
        expect(cell(row, 'Allocation adjustment')).to.equal(
          this.clean(expected.allocationAdjustment),
        );
      }
      if (expected.transactionTag != null) {
        expect(cell(row, 'Transaction tag')).to.equal(this.clean(expected.transactionTag));
      }
      if (expected.transactionDescription != null) {
        expect(cell(row, 'Transaction description')).to.equal(
          this.clean(expected.transactionDescription),
        );
      }
    });
  },

  clean(v) {
    if (v == null) return '';
    let s = String(v).trim();
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
    return s;
  },

  parseCsvLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  },

  clickRolloverErrorsCsv(ledgerName, fyCode) {
    const fileName = `${ledgerName}-rollover-errors-${fyCode}.csv`;

    cy.contains(
      '[role="alert"] [data-test-text-link="true"] [data-test-headline="true"]',
      fileName,
      { timeout: 60_000 },
    )
      .should('be.visible')
      .click();

    const downloadsFolder = Cypress.config('downloadsFolder') || 'cypress/downloads';
    cy.readFile(`${downloadsFolder}/${fileName}`, { timeout: 30_000 }).should('exist');

    return cy.wrap(fileName);
  },

  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect([ledgerResultsPaneSection.exists(), ledgersFiltersSection.exists()]);
  },

  searchByName: (name) => {
    cy.do([searchField.selectIndex('Name'), searchField.fillIn(name), searchButton.click()]);
  },

  verifyLedgerLinkExists: (name) => {
    cy.expect(ledgerResultsPaneSection.find(Link(name)).exists());
  },

  checkColumnContentInDownloadedLedgerExport(
    fileName,
    fileRow,
    fund,
    budgetNameExpected, // pass the actual budget.name here
    allowableEncumbrance,
    allowableExpenditure,
    initialAllocation,
    increase,
    decrease,
    totalAllocation,
    transfers,
    totalFunding,
    encumberedBudget,
    awaitingPaymentBudget,
    expendedBudget,
    unavailable,
    overEncumbered,
    overExpended,
    cashBalance,
    available,
  ) {
    cy.readFile(`cypress/downloads/${fileName}`, 'utf8', { timeout: 15000 }).then((fileContent) => {
      const lines = fileContent.split(/\r?\n/).filter(Boolean);
      const row = this.parseCsvLine(lines[fileRow]);

      expect(row[0]).to.equal(fund.name); // Name (Fund)
      expect(row[1]).to.equal(fund.code); // Code (Fund)
      expect(row[9]).to.equal(fund.description); // Description
      expect(row[10]).to.equal(budgetNameExpected); // Name (Budget)

      expect(row[12]).to.equal(allowableEncumbrance);
      expect(row[13]).to.equal(allowableExpenditure);
      expect(row[15]).to.equal(initialAllocation);
      expect(row[16]).to.equal(increase);
      expect(row[17]).to.equal(decrease);
      expect(row[18]).to.equal(totalAllocation);
      expect(row[19]).to.equal(transfers);
      expect(row[20]).to.equal(totalFunding);
      expect(row[21]).to.equal(encumberedBudget);
      expect(row[22]).to.equal(awaitingPaymentBudget);
      expect(row[23]).to.equal(expendedBudget);
      expect(row[25]).to.equal(unavailable);
      expect(row[26]).to.equal(overEncumbered);
      expect(row[27]).to.equal(overExpended);
      expect(row[28]).to.equal(cashBalance);
      expect(row[29]).to.equal(available);
    });
  },

  checkNoResultsMessage(absenceMessage) {
    cy.expect(ledgerResultsPaneSection.find(HTML(including(absenceMessage))).exists());
  },
};
