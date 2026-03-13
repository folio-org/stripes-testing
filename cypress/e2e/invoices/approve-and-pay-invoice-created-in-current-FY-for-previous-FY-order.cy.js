import Approvals from '../../support/fragments/settings/invoices/approvals';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import DateTools from '../../support/utils/dateTools';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import LedgerRollovers from '../../support/fragments/finance/ledgers/ledgerRollovers';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewExpenseClass from '../../support/fragments/settings/finance/newExpenseClass';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  ORGANIZATION_STATUSES,
  TRANSACTION_TYPES,
} from '../../support/constants';
import { CodeTools, StringTools } from '../../support/utils';
import { BudgetDetails, Transactions, TransactionDetails } from '../../support/fragments/finance';

describe('Invoices', { retries: { runMode: 1 } }, () => {
  const code = CodeTools(4);

  const testData = {
    fiscalYears: {
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        ...DateTools.getFullFiscalYearStartAndEnd(1),
      },
      third: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}03`,
        ...DateTools.getFullFiscalYearStartAndEnd(2),
      },
      fourth: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}04`,
        ...DateTools.getFullFiscalYearStartAndEnd(3),
      },
    },
    ledger: {
      ...Ledgers.getDefaultLedger(),
      restrictEncumbrance: false,
      restrictExpenditures: false,
    },
    fund: {
      ...Funds.getDefaultFund(),
    },
    budget: {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    },
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      status: ORGANIZATION_STATUSES.INACTIVE,
    },
    expenseClass: {
      ...NewExpenseClass.defaultUiBatchGroup,
    },
    invoice: {
      ...NewInvoice.defaultUiInvoice,
    },
    invoiceLine: {
      ...NewInvoiceLine.defaultUiInvoiceLine,
      subTotal: '2',
    },
    user: {},
  };

  const createFiscalYear = (fiscalYearKey) => {
    return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then(
      (fiscalYearResponse) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYearResponse;
      },
    );
  };

  const createFiscalYearsData = () => {
    return createFiscalYear('first')
      .then(() => createFiscalYear('second'))
      .then(() => createFiscalYear('third'))
      .then(() => createFiscalYear('fourth'));
  };

  const createOrganizationAndInvoiceReferenceData = () => {
    return Organizations.createOrganizationViaApi(testData.organization)
      .then((organizationId) => {
        testData.organization.id = organizationId;
        testData.invoice.accountingCode = testData.organization.erpCode;
      })
      .then(() => cy.getBatchGroups())
      .then((batchGroup) => {
        testData.invoice.batchGroup = batchGroup.name;
      });
  };

  const createFundWithBudget = ({ ledgerId, fiscalYearId }) => {
    return Funds.createViaApi({
      ...testData.fund,
      ledgerId,
    }).then((fundResponse) => {
      const budget = {
        ...testData.budget,
        fiscalYearId,
        fundId: fundResponse.fund.id,
      };

      return Budgets.createViaApi(budget).then((budgetResponse) => {
        return { fund: fundResponse.fund, budget: budgetResponse };
      });
    });
  };

  const createLedgerFundBudgetAndExpenseClass = () => {
    return NewExpenseClass.createViaApi(testData.expenseClass)
      .then((expenseClassId) => {
        testData.expenseClass.id = expenseClassId;

        return Ledgers.createViaApi({
          ...testData.ledger,
          fiscalYearOneId: testData.fiscalYears.first.id,
        });
      })
      .then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        return createFundWithBudget({
          ledgerId: testData.ledger.id,
          fiscalYearId: testData.fiscalYears.first.id,
        });
      })
      .then((fundData) => {
        testData.fund = fundData.fund;
        testData.budget = fundData.budget;

        return Budgets.updateBudgetViaApi({
          ...testData.budget,
          statusExpenseClasses: [
            {
              status: 'Active',
              expenseClassId: testData.expenseClass.id,
            },
          ],
        });
      })
      .then((updatedBudgetResponse) => {
        if (updatedBudgetResponse?.body) {
          testData.budget = updatedBudgetResponse.body;
        }
      });
  };

  const performRollover = ({ fromFiscalYear, toFiscalYear }) => {
    const rollover = LedgerRollovers.generateLedgerRollover({
      ledger: testData.ledger,
      fromFiscalYear,
      toFiscalYear,
      needCloseBudgets: false,
      budgetsRollover: [
        {
          rolloverAllocation: true,
          rolloverBudgetValue: 'None',
          addAvailableTo: 'Allocation',
        },
      ],
      encumbrancesRollover: [{ orderType: 'Ongoing', basedOn: 'InitialAmount' }],
    });

    return LedgerRollovers.createLedgerRolloverViaApi(rollover);
  };

  const updateFiscalYearDates = (fiscalYearKey, yearsShift) => {
    const updatedFiscalYear = {
      ...testData.fiscalYears[fiscalYearKey],
      ...DateTools.getFullFiscalYearStartAndEnd(yearsShift),
    };

    return FiscalYears.updateFiscalYearViaApi(updatedFiscalYear).then(() => {
      testData.fiscalYears[fiscalYearKey] = {
        ...updatedFiscalYear,
        _version: updatedFiscalYear._version + 1,
      };
    });
  };

  // Shifts all fiscal year dates relative to current date
  const shiftAllFiscalYears = (yearsShift) => {
    return updateFiscalYearDates('first', yearsShift)
      .then(() => updateFiscalYearDates('second', yearsShift + 1))
      .then(() => updateFiscalYearDates('third', yearsShift + 2))
      .then(() => updateFiscalYearDates('fourth', yearsShift + 3));
  };

  const rolloverToNextFiscalYear = ({ fromKey, toKey, yearsShift }) => {
    return performRollover({
      fromFiscalYear: testData.fiscalYears[fromKey],
      toFiscalYear: testData.fiscalYears[toKey],
    }).then(() => shiftAllFiscalYears(yearsShift));
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
        Permissions.uiOrganizationsViewEdit.gui,
        Permissions.invoiceSettingsAll.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
  };

  before(() => {
    cy.getAdminToken();

    return createFiscalYearsData()
      .then(() => createOrganizationAndInvoiceReferenceData())
      .then(() => createLedgerFundBudgetAndExpenseClass())
      .then(() => {
        Approvals.setApprovePayValueViaApi(true);
      })
      .then(() => rolloverToNextFiscalYear({ fromKey: 'first', toKey: 'second', yearsShift: -1 }))
      .then(() => rolloverToNextFiscalYear({ fromKey: 'second', toKey: 'third', yearsShift: -2 }))
      .then(() => rolloverToNextFiscalYear({ fromKey: 'third', toKey: 'fourth', yearsShift: -3 }))
      .then(() => createUserAndLogin());
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValueViaApi(false);
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C388564 Approve and pay invoice created in current FY for previous FY without related order (thunderjet) (TaaS)',
    { tags: ['criticalPathBroken', 'thunderjet', 'C388564'] },
    () => {
      Invoices.createRolloverInvoiceWithFY(
        testData.invoice,
        testData.organization.name,
        testData.fiscalYears.first,
      );
      Invoices.editInvoice();
      Invoices.cancelEditInvoice();
      InvoiceView.checkInvoiceCanNotBeApprovedWarning(
        InvoiceStates.invoiceCanNotBeApprovedInactiveOrganization,
      );
      Invoices.createInvoiceLineWithFund(testData.invoiceLine, testData.fund);
      InvoiceView.checkInvoiceCanNotBeApprovedWarning(
        InvoiceStates.invoiceCanNotBeApprovedInactiveOrganization,
      );
      Invoices.checkApprovePayButtonState();
      Invoices.clickOnOrganizationFromInvoice(testData.organization.name);

      Organizations.editOrganization();
      Organizations.changeOrganizationStatus(ORGANIZATION_STATUSES.ACTIVE);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(testData.invoice.invoiceNumber);
      Invoices.selectInvoice(testData.invoice.invoiceNumber);
      InvoiceView.checkInvoiceWarningAbsent(
        InvoiceStates.invoiceCanNotBeApprovedInactiveOrganization,
      );
      Invoices.approveAndPayInvoice();
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClass.name,
          value: '100%',
          amount: `$${testData.invoiceLine.subTotal}.00`,
          initialEncumbrance: '-',
          currentEncumbrance: '-',
        },
      ]);
      Invoices.openPageCurrentEncumbrance(`${testData.fund.name}(${testData.fund.code})`);

      Funds.selectPreviousBudgetDetails(2);
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Expended', value: `${testData.invoiceLine.subTotal}.00` }],
        expenseClass: {
          name: testData.expenseClass.name,
          encumbered: '$0.00',
          awaitingPayment: '$0.00',
          expended: `$${testData.invoiceLine.subTotal}.00`,
        },
      });
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.ENCUMBRANCE);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.selectTransactionInList(TRANSACTION_TYPES.PAYMENT);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.first.code },
          { key: 'Amount', value: `($${testData.invoiceLine.subTotal}.00)` },
          { key: 'Source', value: testData.invoice.invoiceNumber },
          { key: 'Type', value: TRANSACTION_TYPES.PAYMENT },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Expense class', value: testData.expenseClass.name },
        ],
      });
      Transactions.closeTransactionsPage();
      Funds.closeBudgetDetails();

      Funds.selectPreviousBudgetDetailsByFY(testData.fund, testData.fiscalYears.second);
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Expended', value: '$0.00' }],
        expenseClass: {
          name: testData.expenseClass.name,
          encumbered: '$0.00',
          awaitingPayment: '$0.00',
          expended: '$0.00',
        },
      });
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.ENCUMBRANCE);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PAYMENT);
      Funds.closeTransactionApp(testData.fund, testData.fiscalYears.second);
      Funds.closeBudgetDetails();

      Funds.selectPreviousBudgetDetailsByFY(testData.fund, testData.fiscalYears.third);
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Expended', value: '$0.00' }],
        expenseClass: {
          name: testData.expenseClass.name,
          encumbered: '$0.00',
          awaitingPayment: '$0.00',
          expended: '$0.00',
        },
      });
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.ENCUMBRANCE);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PAYMENT);
      Funds.closeTransactionApp(testData.fund, testData.fiscalYears.third);
      Funds.closeBudgetDetails();

      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Expended', value: '$0.00' }],
        expenseClass: {
          name: testData.expenseClass.name,
          encumbered: '$0.00',
          awaitingPayment: '$0.00',
          expended: '$0.00',
        },
      });
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.ENCUMBRANCE);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PAYMENT);
    },
  );
});
