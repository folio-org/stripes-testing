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
} from '../../../../../interactors';
import FinanceHelper from '../financeHelper';
import getRandomPostfix from '../../../utils/stringTools';
import InteractorsTools from '../../../utils/interactorsTools';

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
    cy.do(Section({ id: 'pane-ledger-details' }).visible);
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

  rollover: () => {
    cy.do([actionsButton.click(), rolloverButton.click()]);
  },

  exportBudgetInformation: () => {
    cy.do([actionsButton.click(), Button('Export budget information (CSV)').click()]);
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
      Checkbox({ name: 'restrictExpenditures' }).click(),
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
        cy.wait(4000);
        cy.do([
          Modal({ id: 'unpaid-invoice-list-modal' }).find(continueButton).focus(),
          Modal({ id: 'unpaid-invoice-list-modal' }).find(continueButton).click(),
        ]);
      } else {
        // do nothing if modal is not displayed
      }
    });
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
      Button('New').click(),
      TextField('Name*').fillIn(defaultLedger.name),
      TextField('Code*').fillIn(defaultLedger.code),
    ]);
    // TODO: check ability to work through interactors
    cy.get(fiscalYearCss).select(defaultLedger.fiscalYear);
    cy.do(Button('Save & Close').click());
    this.waitForLedgerDetailsLoading();
  },

  resetFilters: () => {
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true }));
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
      Button('Close without saving').click(),
    ]);
  },

  deleteLedgerViaActions: () => {
    cy.do([
      actionsButton.click(),
      Button('Delete').click(),
      Button('Delete', {
        id: 'clickable-ledger-remove-confirmation-confirm',
      }).click(),
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
        method: 'POST',
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

  selectLedger: (ledgerName) => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(8000);

    cy.do(Pane({ id: 'ledger-results-pane' }).find(Link(ledgerName)).click());
  },

  rolloverLogs: () => {
    cy.do([actionsButton.click(), Button('Rollover logs').click()]);
  },

  checkFinancialSummeryQuality: (quantityValue1, quantityValue2) => {
    cy.expect(
      Section({ id: 'financial-summary' })
        .find(HTML(including('Cash balance: $' + quantityValue1)))
        .exists(),
    );
    cy.expect(
      Section({ id: 'financial-summary' })
        .find(HTML(including('Available balance: $' + quantityValue2)))
        .exists(),
    );
  },

  exportRollover: (dataFile) => {
    cy.get('#rollover-logs-list')
      .find('div[role="gridcell"]')
      .contains('a', `${dataFile}-result`)
      .click();
  },

  exportRolloverError: (dataFile) => {
    cy.get('#rollover-logs-list')
      .find('div[role="gridcell"]')
      .contains('a', `${dataFile}-error`)
      .click();
  },

  checkRolloverLogs: (dataFile) => {
    cy.expect([
      MultiColumnList({ id: 'rollover-logs-list' })
        .find(MultiColumnListCell('Successful'))
        .exists(),
    ]);
    cy.get('#rollover-logs-list').find('div[role="gridcell"]').contains('a', `${dataFile}-result`);
    cy.get('#rollover-logs-list')
      .find('div[role="gridcell"]')
      .contains('a', `${dataFile}-settings`);
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
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(
        '"Name (Fund)","Code (Fund)","Status (Fund)","Type","Group (Code)","Acquisition unit","Transfer from","Transfer to","External account number","Description","Name (Budget)","Status (Budget)","Allowable encumbrance","Allowable expenditure","Initial allocation","Increase","Decrease","Total allocation","Transfers","Total Funding","Encumbered (Budget)","Awaiting payment (Budget)","Expended (Budget)","Unavailable","Over encumbered","Over expended","Cash balance","Available","Name (Exp Class)","Code (Exp Class)","Status (Exp Class)","Encumbered (Exp Class)","Awaiting payment (Exp Class)","Expended (Exp Class)","Percentage of total expended"',
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
      expect(actualData[26]).to.equal(cashBalance);
      expect(actualData[27]).to.equal(available);
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
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(
        '"Name (Fund)","Code (Fund)","Status (Fund)","Type","Group (Code)","Acquisition unit","Transfer from","Transfer to","External account number","Description","Name (Budget)","Status (Budget)","Allowable encumbrance","Allowable expenditure","Initial allocation","Increase","Decrease","Total allocation","Transfers","Total Funding","Encumbered (Budget)","Awaiting payment (Budget)","Expended (Budget)","Unavailable","Over encumbered","Over expended","Cash balance","Available","Name (Exp Class)","Code (Exp Class)","Status (Exp Class)","Encumbered (Exp Class)","Awaiting payment (Exp Class)","Expended (Exp Class)","Percentage of total expended"',
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
      expect(actualData[23]).to.equal(unavailable);
      expect(actualData[24]).to.equal(overEncumbered);
      expect(actualData[25]).to.equal(overExpended);
      expect(actualData[26]).to.equal(cashBalance);
      expect(actualData[27]).to.equal(available);
    });
  },

  checkDownloadedErrorFile(fileName, errorType, failedAction, amount, fundID) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(
        '"Ledger rollover ID","Error type","Failed action","Error message","Amount","Fund ID","Fund code","Purchase order ID","Purchase order line number","Purchase order line ID"',
      );

      const actualData = fileRows[1].trim().split(',');
      expect(actualData[1]).to.equal(`"${errorType}"`);
      expect(actualData[2]).to.equal(`"${failedAction}"`);
      expect(actualData[5]).to.equal(amount);
      expect(actualData[6]).to.equal(`"${fundID}"`);
    });
  },

  deleteDownloadedFile(fileName) {
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

  fillInTestRolloverForOneTimeOrdersWithAllocation(
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
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose('Initial encumbrance'),
    ]);
    cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click()]);
  },

  fillInRolloverForOneTimeOrdersWithAllocationAndWithoutCloseBudgets(
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

  fillInTestRolloverForOneTimeOrdersWithAllocationAndWithoutCloseBudgets(
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
    cy.get('button:contains("Test rollover")').eq(0).should('be.visible').trigger('click');
    cy.wait(6000);
    this.continueRollover();
    cy.do([Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click()]);
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
      exportSettingsModal.find(Select({ name: 'expenseClasses' })).choose(exportExpenseclasses),
      exportSettingsModal.find(Button('Export')).click(),
    ]);
    cy.wait(2000);
    InteractorsTools.checkCalloutMessage(`Export of ${ledger.name} data has started`);
    cy.wait(2000);
    InteractorsTools.checkCalloutMessage(`${ledger.name} data was successfully exported to CSV`);
  },
};
