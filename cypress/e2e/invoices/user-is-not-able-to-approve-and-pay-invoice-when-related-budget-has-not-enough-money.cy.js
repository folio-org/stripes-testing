import Approvals from '../../support/fragments/settings/invoices/approvals';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import DateTools from '../../support/utils/dateTools';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
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
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ENCUMBRANCE_STATUSES,
  FINANCIAL_ACTIVITY_OVERRAGES,
  INVOICE_LINE_VIEW_FIELDS,
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

describe('Invoices', () => {
  const code = CodeTools(4);
  const orderLineAmount = 20;
  const secondInvoiceAmount = 80;
  const editedInvoiceLineAmount = 30;
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
    firstInvoice: {},
    secondInvoice: {},
    organization: {},
    acquisitionMethodId: null,
    batchGroupId: null,
    user: {},
    rollover: {},
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
          listUnitPrice: orderLineAmount,
          quantityPhysical: 1,
          poLineEstimatedPrice: orderLineAmount,
        },
        fundDistribution: [
          {
            code: testData.fund.code,
            fundId: testData.fund.id,
            distributionType: 'percentage',
            value: 100,
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
          return OrderLines.getOrderLineByIdViaApi(orderLineResponse.id).then(
            (updatedOrderLine) => {
              testData.orderLine = updatedOrderLine;
            },
          );
        });
      });
    });
  };

  const createFirstInvoice = () => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      poLineId: testData.orderLine.id,
      fiscalYearId: testData.fiscalYears.first.id,
      invoiceStatus: INVOICE_STATUSES.REVIEWED,
      batchGroupId: testData.batchGroupId,
      fundDistributions: testData.orderLine.fundDistribution,
      accountingCode: testData.organization.erpCode,
      subTotal: orderLineAmount,
    }).then((invoiceResponse) => {
      testData.firstInvoice = invoiceResponse;
    });
  };

  const createSecondInvoice = () => {
    return Invoices.createInvoiceWithInvoiceLineWithoutOrderViaApi({
      vendorId: testData.organization.id,
      fiscalYearId: testData.fiscalYears.first.id,
      batchGroupId: testData.batchGroupId,
      invoiceStatus: INVOICE_STATUSES.OPEN,
      fundDistributions: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: 'percentage',
          value: 100,
        },
      ],
      accountingCode: testData.organization.erpCode,
      subTotal: secondInvoiceAmount,
    }).then((invoiceResponse) => {
      testData.secondInvoice = invoiceResponse;

      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.secondInvoice,
        status: INVOICE_STATUSES.PAID,
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
          addAvailableTo: 'Available',
        },
      ],
      encumbrancesRollover: [{ orderType: ORDER_TYPES.ONGOING, basedOn: 'InitialAmount' }],
    });

    return LedgerRollovers.createLedgerRolloverViaApi(rollover).then((rolloverResponse) => {
      testData.rollover = rolloverResponse;
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
    Approvals.setApprovePayValueViaApi(true);
    return createFiscalYearsData()
      .then(() => createLedgerAndFund())
      .then(() => createOrganizationAndReferenceData())
      .then(() => createOrderWithLine())
      .then(() => createFirstInvoice())
      .then(() => createSecondInvoice())
      .then(() => performRollover())
      .then(() => updateFiscalYearDates('first', -1))
      .then(() => updateFiscalYearDates('second', 0))
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
    'C396385 User is not able to approve and pay invoice when related budget has not enough money (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C396385'] },
    () => {
      Invoices.searchByNumber(testData.firstInvoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.firstInvoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.firstInvoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.REVIEWED },
        ],
        invoiceLines: [{ poNumber: testData.order.poNumber }],
        vendorDetails: [
          { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name },
        ],
      });
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: '-',
          value: '100%',
          amount: `$${orderLineAmount}.00`,
          initialEncumbrance: `$${orderLineAmount}.00`,
          currentEncumbrance: `$${orderLineAmount}.00`,
        },
      ]);
      Invoices.editInvoiceLine();
      InvoiceLineEditForm.fillInvoiceLineFields({ subTotal: editedInvoiceLineAmount.toString() });
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.REVIEWED },
        ],
      });
      Invoices.canNotApproveAndPayInvoice(testData.fund);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.REVIEWED },
        ],
      });
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.REVIEWED },
          { key: INVOICE_LINE_VIEW_FIELDS.SUB_TOTAL, value: `$${editedInvoiceLineAmount}.00` },
        ],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: '-',
          value: '100%',
          amount: `$${editedInvoiceLineAmount}.00`,
          initialEncumbrance: `$${orderLineAmount}.00`,
          currentEncumbrance: `$${orderLineAmount}.00`,
        },
      ]);
      Invoices.openPageCurrentEncumbrance(`${testData.fund.name}(${testData.fund.code})`);
      Funds.selectPreviousBudgetDetails();
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.checkTransactionCount(TRANSACTION_TYPES.PAYMENT, 1);
      Funds.selectTransactionInList(TRANSACTION_TYPES.PAYMENT);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `($${secondInvoiceAmount}.00)` },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.secondInvoice.vendorInvoiceNo },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.PAYMENT },
          {
            key: TRANSACTION_DETAIL_FIELDS.FROM,
            value: `${testData.fund.name} (${testData.fund.code})`,
          },
        ],
      });
      TransactionDetails.closeTransactionDetails();
      Funds.selectTransactionInList(TRANSACTION_TYPES.ENCUMBRANCE);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `($${orderLineAmount}.00)` },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          {
            key: TRANSACTION_DETAIL_FIELDS.FROM,
            value: `${testData.fund.name} (${testData.fund.code})`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: `$${orderLineAmount}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
      Transactions.closeTransactionsPage();
      Funds.closeBudgetDetails();
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: '$0.00' },
          { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' },
        ],
      });
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PAYMENT);
      Funds.selectTransactionInList(TRANSACTION_TYPES.ENCUMBRANCE);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `($${orderLineAmount}.00)` },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          {
            key: TRANSACTION_DETAIL_FIELDS.FROM,
            value: `${testData.fund.name} (${testData.fund.code})`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: `$${orderLineAmount}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
    },
  );
});
