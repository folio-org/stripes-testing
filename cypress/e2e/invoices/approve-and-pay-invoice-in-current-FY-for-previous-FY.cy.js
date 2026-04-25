import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import DateTools from '../../support/utils/dateTools';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import InteractorsTools from '../../support/utils/interactorsTools';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
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
  ENCUMBRANCE_STATUSES,
  FINANCIAL_ACTIVITY_OVERRAGES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import { BudgetDetails, TransactionDetails, Transactions } from '../../support/fragments/finance';
import { CodeTools, StringTools } from '../../support/utils';

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
    },
    ledger: {},
    fund: {},
    budget: {},
    order: {},
    orderLine: {},
    invoice: { ...NewInvoice.defaultUiInvoice },
    organization: {},
    acquisitionMethodId: null,
    batchGroup: {},
    expenseClass: {},
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
    return createFiscalYear('first').then(() => createFiscalYear('second'));
  };

  const createLedgerAndFund = () => {
    return Ledgers.createViaApi({
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: testData.fiscalYears.first.id,
      restrictExpenditures: true,
      restrictEncumbrance: true,
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
        testData.invoice.accountingCode = NewOrganization.defaultUiOrganizations.erpCode;
      })
      .then(() => cy.getBatchGroups())
      .then((batchGroup) => {
        testData.batchGroup = batchGroup;
        testData.invoice.batchGroup = batchGroup.name;
      })
      .then(() => {
        return cy.getAcquisitionMethodsApi({
          query: 'value="Purchase"',
        });
      })
      .then((acquisitionMethod) => {
        testData.acquisitionMethodId = acquisitionMethod.body.acquisitionMethods[0].id;
      });
  };

  const createOrderWithLine = () => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: ORDER_TYPES.ONGOING,
      ongoing: { isSubscription: false, manualRenewal: false },
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
          listUnitPrice: 10,
          quantityPhysical: 1,
          poLineEstimatedPrice: 10,
        },
        fundDistribution: [
          {
            code: testData.fund.code,
            fundId: testData.fund.id,
            distributionType: 'percentage',
            value: 100,
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

  const performRollover = () => {
    const rollover = LedgerRollovers.generateLedgerRollover({
      ledger: testData.ledger,
      fromFiscalYear: testData.fiscalYears.first,
      toFiscalYear: testData.fiscalYears.second,
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

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiOrdersView.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  };

  before(() => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(true);
    return createFiscalYearsData()
      .then(() => createLedgerAndFund())
      .then(() => createOrganizationAndReferenceData())
      .then(() => performRollover())
      .then(() => updateFiscalYearDates('first', -1))
      .then(() => updateFiscalYearDates('second', 0))
      .then(() => createOrderWithLine())
      .then(() => createUserAndLogin());
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Approvals.setApprovePayValueViaApi(false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C388526 Approve and pay invoice created in current FY for previous FY when related order line was created in current FY (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C388526'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrder(testData.invoice, testData.fiscalYears.first.code);
      Invoices.approveAndPayInvoice();
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceApprovedAndPaidMessage);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
        invoiceLines: [
          {
            poNumber: testData.order.poNumber,
            receiptStatus: ORDER_TYPES.ONGOING,
            paymentStatus: ORDER_TYPES.ONGOING,
          },
        ],
      });
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClass.name,
          value: '100%',
          amount: testData.orderLine.cost.poLineEstimatedPrice,
          initialEncumbrance: '-',
          currentEncumbrance: '-',
        },
      ]);
      Invoices.openPageCurrentEncumbrance(`${testData.fund.name}(${testData.fund.code})`);
      Funds.selectPreviousBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          {
            key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
        ],
        expenseClass: {
          name: testData.expenseClass.name,
          encumbered: '$0.00',
          awaitingPayment: '$0.00',
          expended: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
        },
      });
      Funds.viewTransactions();
      Funds.selectTransactionInList(TRANSACTION_TYPES.PAYMENT);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          {
            key: TRANSACTION_DETAIL_FIELDS.AMOUNT,
            value: `($${testData.orderLine.cost.poLineEstimatedPrice}.00)`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.invoice.invoiceNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.PAYMENT },
          {
            key: TRANSACTION_DETAIL_FIELDS.FROM,
            value: `${testData.fund.name} (${testData.fund.code})`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: testData.expenseClass.name },
        ],
      });
      Transactions.closeTransactionsPage();
      Funds.closeBudgetDetails();
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' }],
        expenseClass: {
          name: testData.expenseClass.name,
          encumbered: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
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
            key: TRANSACTION_DETAIL_FIELDS.AMOUNT,
            value: `($${testData.orderLine.cost.poLineEstimatedPrice}.00)`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          {
            key: TRANSACTION_DETAIL_FIELDS.FROM,
            value: `${testData.fund.name} (${testData.fund.code})`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: testData.expenseClass.name },
          {
            key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
    },
  );
});
