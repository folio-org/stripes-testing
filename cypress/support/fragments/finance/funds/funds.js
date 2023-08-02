import uuid from 'uuid';
import {
  Button,
  TextField,
  Selection,
  SelectionList,
  Accordion,
  Modal,
  Checkbox,
  MultiSelect,
  SearchField,
  Section,
  HTML,
  including,
  KeyValue,
  Pane,
  MultiColumnListRow,
  MultiColumnListCell,
  SelectionOption,
  Link,
  MultiColumnList,
  MultiSelectOption,
} from '../../../../../interactors';
import FinanceHelp from '../financeHelper';
import TopMenu from '../../topMenu';
import getRandomPostfix from '../../../utils/stringTools';
import Describer from '../../../utils/describer';
import InteractorsTools from '../../../utils/interactorsTools';

const createdFundNameXpath =
  '//*[@id="paneHeaderpane-fund-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader =
  '//*[@id="paneHeaderfund-results-pane-subtitle"]/span';
const zeroResultsFoundText = '0 records found';
const budgetTitleXpath = '//*[@id="paneHeaderpane-budget-pane-title"]/h2/span';
const noItemsMessage = 'The list contains no items';
const viewTransactionsLinkXpath = '//a[text()="View transactions"]';
const budgetPaneId = 'pane-budget';
const transactionResultPaneId = 'transaction-results-pane';
const saveAndCloseButton = Button({ id: 'clickable-save-title' });
const currentBudgetSection = Section({ id: 'currentBudget' });
const actionsButton = Button('Actions');
const deleteButton = Button('Delete');
const transferButton = Button('Transfer');
const FundsTab = Button('Fund');
const searchField = SearchField({ id: 'input-record-search' });
const amountTextField = TextField({ name: 'amount' });
const confirmButton = Button('Confirm');
const newButton = Button('New');
const cancelButton = Button('Cancel');
const nameField = TextField('Name*');
const codeField = TextField('Code*');
const externalAccountField = TextField('External account*');
const ledgerSelection = Selection('Ledger*');
const transactionDetailSection = Section({ id: 'pane-transaction-details' });
const transactionList = MultiColumnList({ id: 'transactions-list' });
const budgetSummaryAcordion = Accordion('Budget summary');
const budgetInformationAcordion = Accordion('Budget information');
const fundingInformationMCList = MultiColumnList({ ariaRowCount: 7 });
const FinancialActivityAndOveragesMCList = MultiColumnList({ ariaRowCount: 5 });
const resetButton = Button({ id: 'reset-funds-filters' });
const addTransferModal = Modal({ id: 'add-transfer-modal' });
const closeWithoutSavingButton = Button('Close without saving');

export default {
  defaultUiFund: {
    name: `autotest_fund_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  },

  defaultUiBudget: {
    allocated: 50,
    allowableEncumbrance: 100,
    allowableExpenditure: 100,
    budgetStatus: 'Active',
  },
  waitLoading: () => {
    cy.expect(Pane({ id: 'fund-results-pane' }).exists());
  },

  waitLoadingTransactions: () => {
    cy.expect(Pane({ id: 'transaction-results-pane' }).exists());
  },

  checkSearch() {
    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));
  },

  waitForFundDetailsLoading: () => {
    cy.do(Section({ id: 'pane-fund-details' }).visible());
  },

  createFund(fund) {
    cy.do([
      newButton.click(),
      nameField.fillIn(fund.name),
      codeField.fillIn(fund.code),
      externalAccountField.fillIn(fund.externalAccount),
      ledgerSelection.open(),
      SelectionList().select(fund.ledgerName),
      saveAndCloseButton.click(),
    ]);
    this.waitForFundDetailsLoading();
  },

  cancelCreatingFundWithTransfers(defaultFund, defaultLedger, firstFund, secondFund) {
    cy.do([
      newButton.click(),
      nameField.fillIn(defaultFund.name),
      codeField.fillIn(defaultFund.code),
      ledgerSelection.open(),
      SelectionList().select(defaultLedger),
    ]);
    // TO DO: change xpath to interactors when it would be possible
    cy.get('[data-test-col-transfer-from="true"]').click();
    cy.get('[data-test-col-transfer-from="true"] ul[role="listbox"]')
      .contains(firstFund.name)
      .click();
    cy.get('[data-test-col-transfer-to="true"]').click();
    cy.get('[data-test-col-transfer-to="true"] ul[role="listbox"]')
      .contains(secondFund.name)
      .click();
    cy.do([
      cancelButton.click(),
      closeWithoutSavingButton.click()
    ]);
    this.waitLoading();
  },

  createFundForWarningMessage(fund) {
    cy.do([
      newButton.click(),
      nameField.fillIn(fund.name),
      codeField.fillIn(fund.code),
      externalAccountField.fillIn(fund.externalAccountNo),
      ledgerSelection.find(Button()).click(),
    ]);
  },

  addGroupToFund: (group) => {
    cy.do([
      actionsButton.click(),
      Button('Edit').click(),
      MultiSelect({ label: 'Group' }).select([group]),
      saveAndCloseButton.click(),
    ]);
  },

  addTrunsferTo: (fund) => {
    cy.do([
      actionsButton.click(),
      Button('Edit').click(),
      MultiSelect({ label: 'Transfer to' }).select([fund]),
      saveAndCloseButton.click()
    ]);
  },

  checkAddGroupToFund: (group) => {
    cy.expect(Pane({ id: 'pane-fund-details' }).exists());
    cy.expect(
      Accordion({ id: 'information' })
        .find(KeyValue({ value: group }))
        .exists()
    );
  },

  checkWarningMessageFundCodeUsed: () => {
    cy.do(codeField.has({ error: 'This Fund code is already in use.' }));
  },

  checkCreatedFund: (fundName) => {
    cy.xpath(createdFundNameXpath)
      .should('be.visible')
      .and('have.text', fundName);
  },

  tryToCreateFundWithoutMandatoryFields: (fundName) => {
    cy.do([
      newButton.click(),
      nameField.fillIn(fundName),
      Button('Save & Close').click(),
      codeField.fillIn('some code'),
      Button('Save & Close').click(),
      externalAccountField.fillIn('some account'),
      Button('Save & Close').click(),
      // try to navigate without saving
      Button('Agreements').click(),
      Button('Keep editing').click,
      cancelButton.click(),
      Button('Close without saving').click(),
    ]);
  },
  checkBudgetQuantity1: (quantityValue1, quantityValue2) => {
    // TODO: refactor using interactors (Mutli column list)
    cy.expect(
      Section({ id: budgetPaneId })
        .find(HTML(including('Cash balance: $' + quantityValue1)))
        .exists()
    );
    cy.expect(
      Section({ id: budgetPaneId })
        .find(HTML(including('Available balance: $' + quantityValue2)))
        .exists()
    );
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  deleteFundViaActions: () => {
    cy.expect(actionsButton.exists());
    cy.do([
      actionsButton.click(),
      deleteButton.click(),
      Button('Delete', {
        id: 'clickable-fund-remove-confirmation-confirm',
      }).click(),
    ]);
    cy.wait(4000);
  },

  addBudget: (allocatedQuantity) => {
    cy.do(Accordion('Current budget').find(newButton).click());
    cy.expect(Modal('Current budget').exists());
    cy.do([
      Modal('Current budget')
        .find(TextField({ name: 'allocated' }))
        .fillIn(allocatedQuantity.toString()),
      Button('Save').click(),
    ]);
  },

  viewTransactions: () => {
    cy.do(Link('View transactions').click());
  },

  checkTransactionList: (fundCode) => {
    cy.expect([
      transactionList
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: '$50.00' }),
      transactionList
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 4 }))
        .has({ content: `${fundCode}` }),
    ]);
  },

  checkTransactionDetails: (
    indexNumber,
    fiscalYear,
    amount,
    source,
    type,
    fund,
    status
  ) => {
    cy.do(
      transactionList
        .find(MultiColumnListRow({ index: indexNumber }))
        .find(Link())
        .click()
    );
    cy.expect(
      transactionDetailSection
        .find(KeyValue('Fiscal year'))
        .has({ value: fiscalYear }),
      transactionDetailSection.find(KeyValue('Amount')).has({ value: amount }),
      transactionDetailSection.find(KeyValue('Source')).has({ value: source }),
      transactionDetailSection.find(KeyValue('Type')).has({ value: type }),
      transactionDetailSection.find(KeyValue('From')).has({ value: fund }),
      transactionDetailSection.find(KeyValue('Status')).has({ value: status })
    );
  },

  checkPaymentInTransactionDetails: (
    indexNumber,
    fiscalYear,
    source,
    fund,
    amount
  ) => {
    cy.do(
      transactionList
        .find(MultiColumnListRow({ index: indexNumber }))
        .find(Link())
        .click()
    );
    cy.expect(
      transactionDetailSection
        .find(KeyValue('Fiscal year'))
        .has({ value: fiscalYear }),
      transactionDetailSection.find(KeyValue('Amount')).has({ value: amount }),
      transactionDetailSection.find(KeyValue('Source')).has({ value: source }),
      transactionDetailSection.find(KeyValue('Type')).has({ value: 'Payment' }),
      transactionDetailSection.find(KeyValue('From')).has({ value: fund })
    );
  },

  checkOrderInTransactionList: (fundCode, amount) => {
    cy.expect([
      transactionList
        .find(MultiColumnListRow({ index: 1 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: 'Encumbrance' }),
      transactionList
        .find(MultiColumnListRow({ index: 1 }))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: `${amount}` }),
      transactionList
        .find(MultiColumnListRow({ index: 1 }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .has({ content: `${fundCode}` }),
      transactionList
        .find(MultiColumnListRow({ index: 1 }))
        .find(MultiColumnListCell({ columnIndex: 5 }))
        .has({ content: 'PO line' }),
    ]);
  },

  increaseAllocation: () => {
    cy.do([
      actionsButton.click(),
      Button('Increase allocation').click(),
      amountTextField.fillIn('50'),
    ]);
    cy.wait(2000);
    cy.do(addTransferModal.find(confirmButton).click());
  },

  transfer: (thisFund, fromFund) => {
    cy.do([
      actionsButton.click(),
      transferButton.click(),
      Button({ name: 'toFundId' }).click(),
      SelectionOption(`${thisFund.name} (${thisFund.code})`).click(),
      Button({ name: 'fromFundId' }).click(),
      SelectionOption(`${fromFund.name} (${fromFund.code})`).click(),
      amountTextField.fillIn('10'),
      addTransferModal.find(confirmButton).click(),
    ]);
  },

  checkCreatedBudget: (fundCode, fiscalYear) => {
    cy.expect(budgetSummaryAcordion.exists());
    cy.expect(budgetInformationAcordion.exists());
    cy.xpath(budgetTitleXpath)
      .should('be.visible')
      .and('have.text', fundCode.concat('-', fiscalYear));
  },

  checkFundingInformation: (
    amountInitialAllocation,
    amountIncreaseInAllocation,
    amountDecreaseInAllocation,
    amountTotalAllocated,
    amountNetTransfers,
    amountTotalFunding
  ) => {
    cy.expect(budgetSummaryAcordion.exists());
    cy.expect(budgetInformationAcordion.exists());
    cy.expect([
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-0' }))
        .find(MultiColumnListCell({ content: 'Initial allocation' }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-0' }))
        .find(MultiColumnListCell({ content: amountInitialAllocation }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-1' }))
        .find(MultiColumnListCell({ content: 'Increase in allocation' }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-1' }))
        .find(MultiColumnListCell({ content: amountIncreaseInAllocation }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-2' }))
        .find(MultiColumnListCell({ content: 'Decrease in allocation' }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-2' }))
        .find(MultiColumnListCell({ content: amountDecreaseInAllocation }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-3' }))
        .find(MultiColumnListCell({ content: 'Total allocated' }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-3' }))
        .find(MultiColumnListCell({ content: amountTotalAllocated }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-4' }))
        .find(MultiColumnListCell({ content: 'Net transfers' }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-4' }))
        .find(MultiColumnListCell({ content: amountNetTransfers }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-5' }))
        .find(MultiColumnListCell({ content: 'Total funding' }))
        .exists(),
      fundingInformationMCList
        .find(MultiColumnListRow({ indexRow: 'row-5' }))
        .find(MultiColumnListCell({ content: amountTotalFunding }))
        .exists(),
    ]);
  },

  checkFinancialActivityAndOverages: (
    amountEncumbered,
    amountAwaitingPayment,
    amountExpended,
    amountUnavailable
  ) => {
    cy.expect(budgetSummaryAcordion.exists());
    cy.expect(budgetInformationAcordion.exists());
    cy.expect([
      FinancialActivityAndOveragesMCList.find(
        MultiColumnListRow({ indexRow: 'row-0' })
      )
        .find(MultiColumnListCell({ content: 'Encumbered' }))
        .exists(),
      FinancialActivityAndOveragesMCList.find(
        MultiColumnListRow({ indexRow: 'row-0' })
      )
        .find(MultiColumnListCell({ content: amountEncumbered }))
        .exists(),
      FinancialActivityAndOveragesMCList.find(
        MultiColumnListRow({ indexRow: 'row-1' })
      )
        .find(MultiColumnListCell({ content: 'Awaiting payment' }))
        .exists(),
      FinancialActivityAndOveragesMCList.find(
        MultiColumnListRow({ indexRow: 'row-1' })
      )
        .find(MultiColumnListCell({ content: amountAwaitingPayment }))
        .exists(),
      FinancialActivityAndOveragesMCList.find(
        MultiColumnListRow({ indexRow: 'row-2' })
      )
        .find(MultiColumnListCell({ content: 'Expended' }))
        .exists(),
      FinancialActivityAndOveragesMCList.find(
        MultiColumnListRow({ indexRow: 'row-2' })
      )
        .find(MultiColumnListCell({ content: amountExpended }))
        .exists(),
      FinancialActivityAndOveragesMCList.find(
        MultiColumnListRow({ indexRow: 'row-3' })
      )
        .find(MultiColumnListCell({ content: 'Unavailable' }))
        .exists(),
      FinancialActivityAndOveragesMCList.find(
        MultiColumnListRow({ indexRow: 'row-3' })
      )
        .find(MultiColumnListCell({ content: amountUnavailable }))
        .exists(),
    ]);
  },

  checkBudgetQuantity: (quantityValue) => {
    // TODO: refactor using interactors (Mutli column list)
    cy.expect(
      Section({ id: budgetPaneId })
        .find(HTML(including('Cash balance: $' + quantityValue.toFixed(2))))
        .exists()
    );
    cy.expect(
      Section({ id: budgetPaneId })
        .find(
          HTML(including('Available balance: $' + quantityValue.toFixed(2)))
        )
        .exists()
    );
  },

  openTransactions: () => {
    cy.expect(
      Section({ id: 'information' }).find(KeyValue('Transactions')).exists()
    );
    // TODO: refactor via using interactors. Simple click() doesn't work, need to find a way to work with child
    cy.xpath(viewTransactionsLinkXpath).click();
  },

  checkTransaction: (rowNumber, transaction) => {
    Describer.getProperties(transaction).forEach(function (val) {
      cy.expect(
        Pane({ id: transactionResultPaneId })
          .find(MultiColumnListRow({ index: rowNumber }))
          .find(MultiColumnListCell({ content: transaction[val] }))
          .exists()
      );
    });
  },

  transferAmount: (amount, fundFrom, fundTo) => {
    cy.do([actionsButton.click(), transferButton.click()]);
    cy.expect(Modal('Transfer').exists());
    cy.do([
      TextField('Amount*').fillIn(amount.toString()),
      Selection('From').open(),
      SelectionList().select(
        fundFrom.name.concat(' ', '(', fundFrom.code, ')')
      ),
      Selection('To').open(),
      SelectionList().select(fundTo.name.concat(' ', '(', fundTo.code, ')')),
      confirmButton.click(),
    ]);
  },

  deleteBudgetViaActions() {
    cy.wait(4000);
    cy.do([
      actionsButton.click(),
      deleteButton.click(),
      Button('Delete', {
        id: 'clickable-budget-remove-confirmation-confirm',
      }).click(),
    ]);
    this.waitForFundDetailsLoading();
  },

  tryToDeleteBudgetWithTransaction() {
    cy.do([
      actionsButton.click(),
      deleteButton.click(),
      Button('Delete', {
        id: 'clickable-budget-remove-confirmation-confirm',
      }).click(),
    ]);
    cy.expect(Section({ id: 'summary' }).exists());
  },

  checkDeletedBudget: (budgetSectionId) => {
    cy.expect(
      Section({ id: budgetSectionId })
        .find(HTML(including(noItemsMessage)))
        .exists()
    );
  },

  resetFundFilters: () => {
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true }));
  },

  selectStatusInSearch: (fundStatus) => {
    cy.do(Accordion({ id: 'fundStatus' }).clickHeader());
    switch (fundStatus) {
      case FinanceHelp.statusFrozen:
        cy.do(Checkbox({ id: 'clickable-filter-fundStatus-frozen' }).click());
        break;
      case FinanceHelp.statusActive:
        cy.do(Checkbox({ id: 'clickable-filter-fundStatus-active' }).click());
        break;
      case FinanceHelp.statusInactive:
        cy.do(Checkbox({ id: 'clickable-filter-fundStatus-inactive' }).click());
        break;
      default:
        cy.log(
          'No such status like ' +
            fundStatus +
            '. Please use frozen, active or inactive'
        );
    }
  },

  checkFundFilters(
    ledgerName,
    fundType,
    fundStatus,
    aUnits,
    tags,
    groupName,
    fundName
  ) {
    // TODO: check how it can be achieved with interactors
    cy.xpath('//*[@id="accordion-toggle-button-fundStatus"]').should(
      'be.visible'
    );
    this.selectStatusInSearch(fundStatus);
    // TODO: check how it can be achieved with interactors
    cy.xpath('//*[@id="accordion-toggle-button-ledgerId"]').should(
      'be.visible'
    );
    cy.do([
      Accordion({ id: 'ledgerId' }).clickHeader(),
      Selection({ id: 'ledgerId-selection' }).open(),
      SelectionList({ id: 'sl-container-ledgerId-selection' }).select(
        ledgerName
      ),

      Accordion({ id: 'fundTypeId' }).clickHeader(),
      Selection({ id: 'fundTypeId-selection' }).open(),
      SelectionList({ id: 'sl-container-fundTypeId-selection' }).select(
        fundType
      ),

      Accordion({ id: 'groupFundFY.groupId' }).clickHeader(),
      Selection({ id: 'groupFundFY.groupId-selection' }).open(),
      SelectionList({
        id: 'sl-container-groupFundFY.groupId-selection',
      }).select(groupName),

      Accordion({ id: 'acqUnitIds' }).clickHeader(),
      Selection({ id: 'acqUnitIds-selection' }).open(),
      SelectionList({ id: 'sl-container-acqUnitIds-selection' }).select(aUnits),

      Accordion({ id: 'tags' }).clickHeader(),
      MultiSelect({ id: 'acq-tags-filter' }).select(tags),

      SearchField({ id: 'input-record-search' }).fillIn(fundName),
      Button('Search').click(),
    ]);
  },

  createFundViaUI(fund) {
    const ledger = {
      id: uuid(),
      name: `autotest_ledger_${getRandomPostfix()}`,
      code: `autotest_code_${getRandomPostfix()}`,
      description: `autotest_ledger_ description_${getRandomPostfix()}`,
      ledgerStatus: 'Frozen',
      currency: 'USD',
      restrictEncumbrance: false,
      restrictExpenditures: false,
      acqUnitIds: '',
      fiscalYearOneId: '',
    };
    cy.getAdminToken();
    cy.getAcqUnitsApi({ limit: 1 }).then(({ body }) => {
      ledger.acqUnitIds = [body.acquisitionsUnits[0].id];
      cy.getFiscalYearsApi({ limit: 1 }).then((response) => {
        ledger.fiscalYearOneId = response.body.fiscalYears[0].id;
        cy.createLedgerApi({
          ...ledger,
        });
        fund.ledgerName = ledger.name;
        cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
        cy.visit(TopMenu.fundPath);
        this.createFund(fund);
        this.checkCreatedFund(fund.name);
        cy.wrap(ledger).as('createdLedger');
        return cy.get('@createdLedger');
      });
    });
    return cy.get('@createdLedger');
  },

  openBudgetDetails: (fundCode, fiscalYear) => {
    cy.do([
      Accordion({ id: 'currentBudget' })
        .find(
          MultiColumnListCell({ content: fundCode.concat('-', fiscalYear) })
        )
        .click(),
    ]);
  },

  selectBudgetDetails: (rowNumber = 0) => {
    cy.do([
      currentBudgetSection
        .find(MultiColumnListRow({ index: rowNumber }))
        .click(),
    ]);
  },

  selectPlannedBudgetDetails: (rowNumber = 0) => {
    cy.do([
      Section({ id: 'plannedBudget' })
        .find(MultiColumnListRow({ index: rowNumber }))
        .click(),
    ]);
  },

  checkIsBudgetDeleted: (rowNumber = 0) => {
    cy.expect([
      currentBudgetSection
        .find(MultiColumnListRow({ index: rowNumber }))
        .absent(),
    ]);
  },

  editBudget: () => {
    cy.do([actionsButton.click(), Button('Edit').click()]);
  },

  addExpensesClass: (firstExpenseClassName) => {
    cy.do([
      Button({ id: 'budget-status-expense-classes-add-button' }).click(),
      Button({ name: 'statusExpenseClasses[0].expenseClassId' }).click(),
      SelectionOption(firstExpenseClassName).click(),
    ]);
    cy.wait(2000);
    cy.do(saveAndCloseButton.click());
    cy.wait(2000);
  },
  deleteExpensesClass: () => {
    cy.wait(2000);
    cy.do([
      Section({ id: 'expense-classes' })
        .find(Button({ icon: 'trash' }))
        .click(),
      saveAndCloseButton.click(),
    ]);
  },

  createViaApi: (fundProperties) => {
    return cy
      .okapiRequest({
        path: 'finance/funds',
        body: { fund: fundProperties },
        method: 'POST',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  addBudgetToFundViaApi: (budgetProperties) => {
    return cy
      .okapiRequest({
        path: 'finance/budgets',
        body: budgetProperties,
        method: 'POST',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteFundViaApi: (fundId) => cy.okapiRequest({
    method: 'DELETE',
    path: `finance/funds/${fundId}`,
    isDefaultSearchParamsRequired: false,
  }),

  deleteBudgetViaApi: (budgetId) => cy.okapiRequest({
    method: 'DELETE',
    path: `finance/budgets/${budgetId}`,
    isDefaultSearchParamsRequired: false,
  }),
  createFundWithAU(fund, ledger, AUName) {
    cy.do([
      newButton.click(),
      nameField.fillIn(fund.name),
      codeField.fillIn(fund.code),
      externalAccountField.fillIn(fund.externalAccountNo),
      ledgerSelection.open(),
      SelectionList().select(ledger.name),
    ]);
    // Need wait, while data is loading
    cy.wait(4000);
    cy.do([
      MultiSelect({ id: 'fund-acq-units' })
        .find(Button({ ariaLabel: 'open menu' }))
        .click(),
      MultiSelectOption(AUName).click(),
      saveAndCloseButton.click(),
    ]);
    this.waitForFundDetailsLoading();
  },

  selectTransaction: (indexRowNumber) => {
    cy.do([
      MultiColumnListRow({ indexRow: indexRowNumber }).find(Link()).click(),
    ]);
  },

  checkEncumbrance: (orderNumber) => {
    cy.expect([
      KeyValue('Amount').exists(),
      KeyValue({ value: '$0.00' }).exists(),
      KeyValue({ value: `${orderNumber}-1` }),
    ]);
  },

  checkPendingPayment: (invoiceNumber) => {
    cy.expect(KeyValue({ value: invoiceNumber }).exists());
  },

  checkCancelPendingPayment: (invoiceNumber) => {
    cy.expect(KeyValue({ value: invoiceNumber }).exists());
    cy.do(
      Section({ id: 'information' })
        .find(Button({ icon: 'info' }))
        .click()
    );
  },
  clickOnFundsTab: () => {
    cy.do([FundsTab.click()]);
  },
  searchByName: (name) => {
    cy.do([
      searchField.selectIndex('Name'),
      searchField.fillIn(name),
      Button('Search').click(),
    ]);
    cy.wait(4000);
  },

  selectFund: (FundName) => {
    cy.do(Pane({ id: 'fund-results-pane' }).find(Link(FundName)).click());
  },

  closeMenu: () => {
    cy.do(Button({ icon: 'times' }).click());
  },

  closeTransactionDetails: () => {
    cy.do(
      Section({ id: 'pane-transaction-details' })
        .find(Button({ icon: 'times' }))
        .click()
    );
  },

  clickInfoInTransactionDetails: () => {
    cy.do(
      Section({ id: 'pane-transaction-details' })
        .find(Button({ icon: 'info' }))
        .click()
    );
  },

  addAUToFund: (AUName) => {
    cy.do([actionsButton.click(), Button('Edit').click()]);
    cy.wait(4000);
    cy.do([
      MultiSelect({ id: 'fund-acq-units' })
        .find(Button({ ariaLabel: 'open menu' }))
        .click(),
      MultiSelectOption(AUName).click(),
      saveAndCloseButton.click(),
    ]);
    cy.wait(4000);
  },

  moveAllocationWithError: (firstFund, secondFund, amount) => {
    cy.do([actionsButton.click(), Button('Move allocation').click()]);
    cy.wait(4000);
    cy.do([
      addTransferModal.find(Button({ name: 'fromFundId' })).click(),
    ]);
    cy.wait(6000);
    cy.get('[role="option"]').contains(`${secondFund.name} (${secondFund.code})`).click();
    cy.do([
      addTransferModal.find(TextField({ name: 'amount' })).fillIn(amount),
      addTransferModal.find(confirmButton).click(),
    ]);
    InteractorsTools.checkCalloutErrorMessage(
      `$50.00 was not successfully allocated because ${secondFund.code} has no budget`
    );
    cy.do(addTransferModal.find(cancelButton).click());
  },
};
