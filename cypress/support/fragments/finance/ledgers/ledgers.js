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

const createdLedgerNameXpath =
  '//*[@id="paneHeaderpane-ledger-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader =
  '//*[@id="paneHeaderledger-results-pane-subtitle"]/span';
const rolloverButton = Button('Rollover');
const continueButton = Button('Continue');
const confirmButton = Button('Confirm');
const ledgertab = Button('Ledger');
const fundtab = Button('Fund');
const fiscalYearTab = Button('Fiscal year');
const zeroResultsFoundText = '0 records found';
const fiscalYearCss = 'select[name^="fiscalYearOneId"]';
const rolloverConfirmButton = Button({
  id: 'clickable-rollover-confirmation-confirm',
});
const fiscalYearSelect = Select({ name: 'toFiscalYearId' });
const rolloverAllocationCheckbox = Checkbox({
  name: 'budgetsRollover[0].rolloverAllocation',
});
const rolloverBudgetVelue = Select({
  name: 'budgetsRollover[0].rolloverBudgetValue',
});
const addAvailableToSelect = Select({
  name: 'budgetsRollover[0].addAvailableTo',
});
const resetButton = Button({ id: 'reset-ledgers-filters' });

export default {
  defaultUiLedger: {
    name: `autotest_ledger_${getRandomPostfix()}`,
    ledgerStatus: 'Active',
    code: `test_automation_code_${getRandomPostfix()}`,
    description: 'This is ledger created by E2E test automation script',
  },

  waitForLedgerDetailsLoading: () => {
    cy.do(Section({ id: 'pane-ledger-details' }).visible);
  },

  rollover: () => {
    cy.do([Button('Actions').click(), rolloverButton.click()]);
  },
  clickOnLedgerTab: () => {
    cy.do([ledgertab.click()]);
  },
  clickOnFiscalyearTab: () => {
    cy.do([fiscalYearTab.click()]);
  },
  clickOnFundTab: () => {
    cy.do([fundtab.click()]);
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
    cy.wait(3000);
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Expended'),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose(
        'Initial encumbrance'
      ),
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
    cy.wait(3000);
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      // rolloverAllocationCheckbox.click(),
      Checkbox({ name: 'encumbrancesRollover[0].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[0].basedOn' }).choose('Expended'),
      Checkbox({ name: 'encumbrancesRollover[2].rollover' }).click(),
      Select({ name: 'encumbrancesRollover[2].basedOn' }).choose(
        'Initial encumbrance'
      ),
      rolloverButton.click(),
    ]);
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  continueRollover: () => {
    const continueButton = Button('Continue');
    cy.get('body').then(($body) => {
      if ($body.find('[id=unpaid-invoice-list-modal]').length) {
        cy.wait(4000);
        cy.do(
          Modal({ id: 'unpaid-invoice-list-modal' })
            .find(continueButton)
            .click()
        );
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

  fillInRolloverForCashBalance(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs
  ) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    cy.wait(3000);
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverAllocationCheckbox.click(),
      rolloverBudgetVelue.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      rolloverButton.click(),
    ]);
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },
  selectFund: () => {
    cy.do(
      Section({ id: 'fund' })
        .find(MultiColumnListRow({ index: 0 }))
        .click()
    );
  },
  selectSecondFund: () => {
    cy.do(
      Section({ id: 'fund' })
        .find(MultiColumnListRow({ index: 1 }))
        .click()
    );
  },

  fillInRolloverForCashBalanceWithNotActiveAllocation(
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs
  ) {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    cy.wait(3000);
    cy.do([
      fiscalYearSelect.choose(fiscalYear),
      rolloverBudgetVelue.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      rolloverButton.click(),
    ]);
    cy.wait(4000);
    this.continueRollover();
    cy.do([rolloverConfirmButton.click()]);
  },

  fillInTestRolloverInfoCashBalance: (
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs
  ) => {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    cy.wait(3000);
    cy.do([
      Select({ name: 'toFiscalYearId' }).choose(fiscalYear),
      Checkbox({ name: 'budgetsRollover[0].rolloverAllocation' }).click(),
      rolloverBudgetVelue.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Button('Test rollover').click(),
    ]);
    cy.wait(2000);
    cy.do([
      Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click(),
    ]);
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  checkCreatedLedgerName: (ledger) => {
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
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', {
        id: 'clickable-ledger-remove-confirmation-confirm',
      }).click(),
    ]);
  },

  searchByStatusUnitsAndName(status, acquisitionUnitsName, ledgerName) {
    // TODO: check how it can be achieved with interactors
    cy.xpath('//*[@id="accordion-toggle-button-ledgerStatus"]').should(
      'be.visible'
    );
    this.selectStatusInSearch(status);
    cy.do([
      Accordion({ id: 'acqUnitIds' }).clickHeader(),
      Selection({ id: 'acqUnitIds-selection' }).open(),
      SelectionList({ id: 'sl-container-acqUnitIds-selection' }).select(
        acquisitionUnitsName
      ),
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
        cy.do(
          Checkbox({ id: 'clickable-filter-ledgerStatus-inactive' }).click()
        );
        break;
      default:
        cy.log(
          'No such status like ' +
            ledgerStatus +
            '. Please use frozen, active or inactive'
        );
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
    cy.do(Pane({ id: 'ledger-results-pane' }).find(Link(ledgerName)).click());
  },

  rolloverLogs: () => {
    cy.do([Button('Actions').click(), Button('Rollover logs').click()]);
  },

  checkFinancialSummeryQuality: (quantityValue1, quantityValue2) => {
    cy.expect(
      Section({ id: 'financial-summary' })
        .find(HTML(including('Cash balance: $' + quantityValue1)))
        .exists()
    );
    cy.expect(
      Section({ id: 'financial-summary' })
        .find(HTML(including('Available balance: $' + quantityValue2)))
        .exists()
    );
  },

  exportRollover: (dataFile) => {
    cy.get('#rollover-logs-list')
      .find('div[role="gridcell"]')
      .contains('a', `${dataFile}-result`)
      .click();
  },

  checkRolloverLogs: (dataFile) => {
    cy.expect([
      MultiColumnList({ id: 'rollover-logs-list' })
        .find(MultiColumnListCell('Successful'))
        .exists(),
    ]);
    cy.get('#rollover-logs-list')
      .find('div[role="gridcell"]')
      .contains('result', `${dataFile}-result`);
    cy.get('#rollover-logs-list')
      .find('div[role="gridcell"]')
      .contains('result', `${dataFile}-settings`);
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
    available
  ) {
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(
        '"Name (Fund)","Code (Fund)","Status (Fund)","Type","Group (Code)","Acquisition unit","Transfer from","Transfer to","External account number","Description","Name (Budget)","Status (Budget)","Allowable encumbrance","Allowable expenditure","Initial allocation","Increase","Decrease","Total allocation","Transfers","Total Funding","Encumbered (Budget)","Awaiting payment (Budget)","Expended (Budget)","Unavailable","Over encumbered","Over expended","Cash balance","Available","Name (Exp Class)","Code (Exp Class)","Status (Exp Class)","Encumbered (Exp Class)","Awaiting payment (Exp Class)","Expended (Exp Class)","Percentage of total expended"'
      );

      const actualData = fileRows[1].trim().split(',');
      expect(actualData[0]).to.equal(`"${fund.name}"`);
      expect(actualData[1]).to.equal(`"${fund.code}"`);
      expect(actualData[9]).to.equal(`"${fund.description}"`);
      expect(actualData[10]).to.equal(
        `"${fund.code}-${secondFiscalYear.code}"`
      );
      expect(actualData[12]).to.equal(allowableEncumbrance);
      expect(actualData[13]).to.equal(allowableExpenditure);
      expect(actualData[14]).to.equal(initialAllocation);
      expect(actualData[17]).to.equal(totalAllocation);
      expect(actualData[19]).to.equal(totalFunding);
      expect(actualData[26]).to.equal(cashBalance);
      expect(actualData[27]).to.equal(available);
    });
  },

  deleteDownloadedFile(fileName) {
    const filePath = `cypress\\downloads\\${fileName}`;
    cy.exec(`del "${filePath}"`, { failOnNonZeroExit: false });
  },

  fillInTestRolloverInfoCashBalanceWithNotActiveAllocation: (
    fiscalYear,
    rolloverBudgetValue,
    rolloverValueAs
  ) => {
    cy.do(fiscalYearSelect.click());
    // Need to wait,while date of fiscal year will be loaded
    cy.wait(3000);
    cy.do([
      Select({ name: 'toFiscalYearId' }).choose(fiscalYear),
      rolloverBudgetVelue.choose(rolloverBudgetValue),
      addAvailableToSelect.choose(rolloverValueAs),
      Button('Test rollover').click(),
    ]);
    cy.wait(2000);
    cy.do([
      Button({ id: 'clickable-test-rollover-confirmation-confirm' }).click(),
    ]);
  },
};
