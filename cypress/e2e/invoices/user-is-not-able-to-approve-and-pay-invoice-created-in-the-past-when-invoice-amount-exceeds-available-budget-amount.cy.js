import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import DateTools from '../../support/utils/dateTools';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import LedgerRollovers from '../../support/fragments/finance/ledgers/ledgerRollovers';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ENCUMBRANCE_STATUSES,
  FINANCIAL_ACTIVITY_OVERRAGES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import { BudgetDetails, TransactionDetails, Transactions } from '../../support/fragments/finance';
import { CodeTools, StringTools } from '../../support/utils';

describe('Invoices', () => {
  const code = CodeTools(4);
  const invoiceAmount = 150;
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
    ledger: {},
    fund: {},
    budget: {},
    order: {},
    orderLine: {},
    invoice: {},
    organization: {},
    acquisitionMethodId: null,
    batchGroupId: null,
    expenseClass: {},
    user: {},
    rollovers: {},
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

  const createLedgerAndFund = () => {
    return Ledgers.createViaApi({
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: testData.fiscalYears.first.id,
      restrictExpenditures: true,
      restrictEncumbrance: false,
    }).then((ledgerResponse) => {
      testData.ledger = ledgerResponse;

      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        ledgerId: testData.ledger.id,
      }).then((fundResponse) => {
        testData.fund = fundResponse.fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.first.id,
          fundId: testData.fund.id,
          allocated: 100,
        }).then((budgetResponse) => {
          testData.budget = budgetResponse;

          const expenseClass = ExpenseClasses.getDefaultExpenseClass();
          return ExpenseClasses.createExpenseClassViaApi(expenseClass).then((response) => {
            testData.expenseClass = response;
            return Budgets.updateBudgetViaApi({
              ...testData.budget,
              statusExpenseClasses: [
                {
                  status: 'Active',
                  expenseClassId: response.id,
                },
              ],
            });
          });
        });
      });
    });
  };

  const createOrganizationAndReferenceData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
    })
      .then((organizationId) => {
        testData.organization = {
          ...NewOrganization.defaultUiOrganizations,
          id: organizationId,
        };
      })
      .then(() => cy.getBatchGroups())
      .then((batchGroup) => {
        testData.batchGroupId = batchGroup.id;
      })
      .then(() => {
        return cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        });
      })
      .then((acquisitionMethod) => {
        testData.acquisitionMethodId = acquisitionMethod.body.acquisitionMethods[0].id;
      });
  };

  const createOrderWithLine = () => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      approved: true,
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = {
        ...BasicOrderLine.defaultOrderLine,
        purchaseOrderId: orderResponse.id,
        acquisitionMethod: testData.acquisitionMethodId,
        cost: {
          ...BasicOrderLine.defaultOrderLine.cost,
          listUnitPrice: invoiceAmount,
          quantityPhysical: 1,
          poLineEstimatedPrice: invoiceAmount,
        },
        fundDistribution: [
          {
            code: testData.fund.code,
            fundId: testData.fund.id,
            distributionType: 'amount',
            value: invoiceAmount,
            expenseClassId: testData.expenseClass.id,
          },
        ],
        locations: [],
        physical: {
          materialSupplier: testData.organization.id,
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
        },
      };

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return Orders.getOrderByIdViaApi(orderResponse.id).then((updatedOrder) => {
            testData.order = updatedOrder;
          });
        });
      });
    });
  };

  const performRollover = (fromFiscalYearKey, toFiscalYearKey) => {
    const rollover = LedgerRollovers.generateLedgerRollover({
      ledger: testData.ledger,
      fromFiscalYear: testData.fiscalYears[fromFiscalYearKey],
      toFiscalYear: testData.fiscalYears[toFiscalYearKey],
      needCloseBudgets: false,
      encumbrancesRollover: [{ orderType: 'One-time', basedOn: 'InitialAmount' }],
    });

    return LedgerRollovers.createLedgerRolloverViaApi({
      ...rollover,
      restrictEncumbrance: false,
    }).then((rolloverResponse) => {
      const rolloverKey = `${fromFiscalYearKey}_to_${toFiscalYearKey}`;
      testData.rollovers[rolloverKey] = rolloverResponse;
    });
  };

  const updateFiscalYearDates = (fiscalYearKey, offset) => {
    const updatedFY = {
      ...testData.fiscalYears[fiscalYearKey],
      ...DateTools.getFullFiscalYearStartAndEnd(offset),
    };

    return FiscalYears.updateFiscalYearViaApi(updatedFY).then(() => {
      testData.fiscalYears[fiscalYearKey] = {
        ...updatedFY,
        _version: updatedFY._version + 1,
      };
    });
  };

  const createInvoice = () => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      poLineId: testData.orderLine.id,
      batchGroupId: testData.batchGroupId,
      fundDistributions: testData.orderLine.fundDistribution,
      accountingCode: testData.organization.erpCode,
      subTotal: invoiceAmount,
    }).then((invoiceResponse) => {
      testData.invoice = invoiceResponse;
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
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
    Approvals.setApprovePayValueViaApi(false);
    return createFiscalYearsData()
      .then(() => createLedgerAndFund())
      .then(() => createOrganizationAndReferenceData())
      .then(() => createOrderWithLine())
      .then(() => performRollover('first', 'second'))
      .then(() => updateFiscalYearDates('first', -1))
      .then(() => updateFiscalYearDates('second', 0))
      .then(() => createInvoice())
      .then(() => performRollover('second', 'third'))
      .then(() => updateFiscalYearDates('second', -1))
      .then(() => updateFiscalYearDates('third', 0))
      .then(() => performRollover('third', 'fourth'))
      .then(() => updateFiscalYearDates('third', -1))
      .then(() => updateFiscalYearDates('fourth', 0))
      .then(() => createUserAndLogin());
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C389493 User is not able to approve and pay Invoice created in the past when Invoice amount exceeds available budget amount (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C389493'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
        ],
        invoiceLines: [{ poNumber: testData.order.poNumber }],
        vendorDetails: [
          { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name },
        ],
      });
      Invoices.canNotApproveInvoice(testData.fund);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClass.name,
          value: '100%',
          amount: `$${invoiceAmount}.00`,
          initialEncumbrance: `$${invoiceAmount}.00`,
          currentEncumbrance: `$${invoiceAmount}.00`,
        },
      ]);
      Invoices.openPageCurrentEncumbrance(`${testData.fund.name}(${testData.fund.code})`);
      Funds.selectPreviousBudgetDetails(2);
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' }],
        expenseClass: {
          name: testData.expenseClass.name,
          encumbered: `$${invoiceAmount}.00`,
          awaitingPayment: '$0.00',
          expended: '$0.00',
        },
      });
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PAYMENT);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.selectTransactionInList(TRANSACTION_TYPES.ENCUMBRANCE);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          {
            key: TRANSACTION_DETAIL_FIELDS.TRANSACTION_DATE,
            value: DateTools.getFormattedEndDateWithTimUTC(testData.order.dateOrdered),
          },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `($${invoiceAmount}.00)` },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          {
            key: TRANSACTION_DETAIL_FIELDS.FROM,
            value: `${testData.fund.name} (${testData.fund.code})`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: testData.expenseClass.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: `$${invoiceAmount}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
      Transactions.closeTransactionsPage();
      Funds.closeBudgetDetails();
      Funds.selectPreviousBudgetDetailsByFY(testData.fund, testData.fiscalYears.second);
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' }],
        expenseClass: {
          name: testData.expenseClass.name,
          encumbered: `$${invoiceAmount}.00`,
          awaitingPayment: '$0.00',
          expended: '$0.00',
        },
      });
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PAYMENT);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.selectTransactionInList(TRANSACTION_TYPES.ENCUMBRANCE);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          {
            key: TRANSACTION_DETAIL_FIELDS.TRANSACTION_DATE,
            value: DateTools.getFormattedEndDateWithTimUTC(
              testData.rollovers.first_to_second.metadata.createdDate,
            ),
          },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `($${invoiceAmount}.00)` },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          {
            key: TRANSACTION_DETAIL_FIELDS.FROM,
            value: `${testData.fund.name} (${testData.fund.code})`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: testData.expenseClass.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: `$${invoiceAmount}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
      Transactions.closeTransactionsPage();
      Funds.closeBudgetDetails();
      Funds.selectPreviousBudgetDetailsByFY(testData.fund, testData.fiscalYears.third);
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' }],
        expenseClass: {
          name: testData.expenseClass.name,
          encumbered: `$${invoiceAmount}.00`,
          awaitingPayment: '$0.00',
          expended: '$0.00',
        },
      });
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PAYMENT);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.selectTransactionInList(TRANSACTION_TYPES.ENCUMBRANCE);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.third.code },
          {
            key: TRANSACTION_DETAIL_FIELDS.TRANSACTION_DATE,
            value: DateTools.getFormattedEndDateWithTimUTC(
              testData.rollovers.second_to_third.metadata.createdDate,
            ),
          },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `($${invoiceAmount}.00)` },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          {
            key: TRANSACTION_DETAIL_FIELDS.FROM,
            value: `${testData.fund.name} (${testData.fund.code})`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: testData.expenseClass.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: `$${invoiceAmount}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
      Transactions.closeTransactionsPage();
      Funds.closeBudgetDetails();
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' }],
        expenseClass: {
          name: testData.expenseClass.name,
          encumbered: `$${invoiceAmount}.00`,
          awaitingPayment: '$0.00',
          expended: '$0.00',
        },
      });
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PAYMENT);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.selectTransactionInList(TRANSACTION_TYPES.ENCUMBRANCE);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.fourth.code },
          {
            key: TRANSACTION_DETAIL_FIELDS.TRANSACTION_DATE,
            value: DateTools.getFormattedEndDateWithTimUTC(
              testData.rollovers.third_to_fourth.metadata.createdDate,
            ),
          },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `($${invoiceAmount}.00)` },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          {
            key: TRANSACTION_DETAIL_FIELDS.FROM,
            value: `${testData.fund.name} (${testData.fund.code})`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: testData.expenseClass.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: `$${invoiceAmount}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
    },
  );
});
