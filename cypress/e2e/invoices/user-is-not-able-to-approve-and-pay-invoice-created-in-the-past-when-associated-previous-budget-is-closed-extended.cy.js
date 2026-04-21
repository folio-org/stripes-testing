import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import LedgerRollovers from '../../support/fragments/finance/ledgers/ledgerRollovers';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  FINANCIAL_ACTIVITY_OVERRAGES,
  ORDER_STATUSES,
  ORDER_TYPES,
  LEDGER_ROLLOVER_ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
  LEDGER_ROLLOVER_BUDGET_VALUE,
  ROLLOVER_BUDGET_VALUE_AS,
  TRANSACTION_TYPES,
  TRANSACTION_DETAIL_FIELDS,
  INVOICE_POL_PAYMENT_STATUSES,
  BUDGET_STATUSES,
  ENCUMBRANCE_STATUSES,
  BUDGET_DETAIL_FIELDS,
} from '../../support/constants';
import { BudgetDetails, TransactionDetails, Transactions } from '../../support/fragments/finance';

describe('Invoices', () => {
  const code = CodeTools(4);
  const testData = {
    tag: { label: `tag_${CodeTools(4)}` },
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
    organization: {},
    order: {},
    orderLine: {},
    invoice1: {},
    invoice2: {},
    user: {},
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(testData.fiscalYears.first).then(() => {
      return FiscalYears.createViaApi(testData.fiscalYears.second).then(() => {
        const ledger = {
          ...Ledgers.defaultUiLedger,
          fiscalYearOneId: testData.fiscalYears.first.id,
          restrictEncumbrance: true,
          restrictExpenditures: true,
        };

        return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          testData.ledger = ledgerResponse;

          const fund = {
            ...Funds.getDefaultFund(),
            ledgerId: ledgerResponse.id,
          };

          return Funds.createViaApi(fund).then((fundResponse) => {
            testData.fund = fundResponse.fund;

            const budget = {
              ...Budgets.getDefaultBudget(),
              fiscalYearId: testData.fiscalYears.first.id,
              fundId: fundResponse.fund.id,
              allocated: 100,
            };

            return Budgets.createViaApi(budget).then((budgetResponse) => {
              testData.budget = budgetResponse;
            });
          });
        });
      });
    });
  };

  const createOrderLine = (purchaseOrderId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      cost: {
        listUnitPrice: 20.0,
        currency: 'USD',
        quantityPhysical: 1,
        poLineEstimatedPrice: 20.0,
      },
      fundDistribution: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 100,
        },
      ],
      locations: [],
      acquisitionMethod: acquisitionMethodId,
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
        materialSupplier: testData.organization.id,
      },
    };
  };

  const createOrderWithLine = (acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: ORDER_TYPES.ONE_TIME_API,
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = createOrderLine(orderResponse.id, acquisitionMethodId);

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
            (orderLinesArray) => {
              testData.orderLine = orderLinesArray[0];
            },
          );
        });
      });
    });
  };

  const createInvoice1 = (batchGroupId) => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      poLineId: testData.orderLine.id,
      batchGroupId,
      fundDistributions: testData.orderLine.fundDistribution,
      accountingCode: testData.organization.erpCode,
      subTotal: 20.0,
      releaseEncumbrance: true,
      invoiceStatus: INVOICE_STATUSES.OPEN,
    }).then((invoiceResponse) => {
      testData.invoice1 = invoiceResponse;

      // Get invoice line and update with tag
      return InvoiceLineDetails.getInvoiceLinesViaApi({
        query: `invoiceId=="${invoiceResponse.id}"`,
      }).then((invoiceLines) => {
        const invoiceLine = invoiceLines.invoiceLines[0];
        return InvoiceLineDetails.updateInvoiceLineViaApi({
          ...invoiceLine,
          tags: {
            tagList: [testData.tag.label],
          },
        });
      });
    });
  };

  const createInvoice2 = (batchGroupId) => {
    return Invoices.createInvoiceWithInvoiceLineWithoutOrderViaApi({
      vendorId: testData.organization.id,
      fiscalYearId: testData.fiscalYears.second.id,
      batchGroupId,
      accountingCode: testData.organization.erpCode,
      subTotal: 30.0,
      fundDistributions: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 100,
        },
      ],
    }).then((invoiceResponse) => {
      testData.invoice2 = invoiceResponse;

      // Get invoice line and update with tag
      return InvoiceLineDetails.getInvoiceLinesViaApi({
        query: `invoiceId=="${invoiceResponse.id}"`,
      }).then((invoiceLines) => {
        const invoiceLine = invoiceLines.invoiceLines[0];
        return InvoiceLineDetails.updateInvoiceLineViaApi({
          ...invoiceLine,
          tags: {
            tagList: [testData.tag.label],
          },
        });
      });
    });
  };

  const performRollover = () => {
    const rollover = LedgerRollovers.generateLedgerRollover({
      ledger: testData.ledger,
      needCloseBudgets: true,
      fromFiscalYear: testData.fiscalYears.first,
      toFiscalYear: testData.fiscalYears.second,
      restrictEncumbrance: true,
      restrictExpenditures: true,
      budgetsRollover: [
        {
          rolloverAllocation: true,
          rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.NONE,
          addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.ALLOCATION,
        },
      ],
      encumbrancesRollover: [
        {
          orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONE_TIME,
          basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
        },
      ],
    });

    return LedgerRollovers.createLedgerRolloverViaApi(rollover);
  };

  const performRolloverAndUpdateFiscalYears = () => {
    return performRollover()
      .then(() => {
        return FiscalYears.updateFiscalYearViaApi({
          ...testData.fiscalYears.first,
          _version: 1,
          ...DateTools.getFullFiscalYearStartAndEnd(-1),
        });
      })
      .then(() => {
        return FiscalYears.updateFiscalYearViaApi({
          ...testData.fiscalYears.second,
          _version: 1,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        });
      });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
        name: NewOrganization.defaultUiOrganizations.name,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        })
        .then((acquisitionMethod) => {
          return createOrderWithLine(acquisitionMethod.body.acquisitionMethods[0].id).then(() => {
            return cy.getBatchGroups().then((batchGroup) => {
              return createInvoice1(batchGroup.id)
                .then(() => performRolloverAndUpdateFiscalYears())
                .then(() => createInvoice2(batchGroup.id));
            });
          });
        });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(true);

    return cy.createTagApi(testData.tag).then((tagId) => {
      testData.tag.id = tagId;

      return createFinanceData().then(() => {
        return createOrderData().then(() => {
          return cy
            .createTempUser([
              Permissions.uiInvoicesApproveInvoices.gui,
              Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
              Permissions.uiInvoicesPayInvoices.gui,
              Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
              Permissions.uiFinanceViewFundAndBudget.gui,
              Permissions.uiOrdersView.gui,
            ])
            .then((userProperties) => {
              testData.user = userProperties;

              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.invoicesPath,
                waiter: Invoices.waitLoading,
              });
            });
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValueViaApi(false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Invoices.deleteInvoiceViaApi(testData.invoice1.id);
      Invoices.deleteInvoiceViaApi(testData.invoice2.id);
      Users.deleteViaApi(testData.user.userId);
      cy.deleteTagApi(testData.tag.id);
    });
  });

  it(
    'C396376 User is not able to approve and pay Invoice created in the past when associated previous budget is closed Extended (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C396376'] },
    () => {
      Invoices.selectTagsFilter([testData.tag.label]);
      Invoices.checkSearchResultsContent({
        records: [
          { invoiceNumber: testData.invoice2.vendorInvoiceNo, status: INVOICE_STATUSES.OPEN },
          { invoiceNumber: testData.invoice1.vendorInvoiceNo, status: INVOICE_STATUSES.OPEN },
        ],
      });
      Invoices.selectFiscalYearFilter(testData.fiscalYears.second.code);
      Invoices.checkSearchResultsContent({
        records: [
          { invoiceNumber: testData.invoice2.vendorInvoiceNo, status: INVOICE_STATUSES.OPEN },
        ],
      });
      Invoices.resetFilters();
      Invoices.selectTagsFilter([testData.tag.label]);
      Invoices.selectFiscalYearFilter(testData.fiscalYears.first.code);
      Invoices.checkSearchResultsContent({
        records: [
          { invoiceNumber: testData.invoice1.vendorInvoiceNo, status: INVOICE_STATUSES.OPEN },
        ],
      });
      Invoices.selectInvoice(testData.invoice1.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice1.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [
          {
            poNumber: testData.orderLine.poLineNumber,
            fundCode: testData.fund.code,
          },
        ],
        vendorDetailsInformation: [
          { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name },
        ],
      });
      cy.intercept('PUT', `/invoice/invoices/${testData.invoice1.id}?*`).as('approvePayInvoice');
      InvoiceView.approveAndPayInvoiceWithUpdatePOLPaymentStatus({
        status: INVOICE_POL_PAYMENT_STATUSES.FULLY_PAID_UI,
        errorMessage: InvoiceStates.cannotApprovePayFundHasNoCurrentBudget(
          testData.fund.code,
          testData.fiscalYears.first.code,
        ),
      });
      cy.wait('@approvePayInvoice', { timeout: 60000 }).then((interception) => {
        InvoiceView.checkErrorInvoiceApiResponse(interception, {
          expectedStatus: 404,
          expectedMessage: InvoiceStates.activeBudgetNotFoundMessage,
          expectedErrorCode: InvoiceStates.budgetNotFoundCode,
          expectedFundId: testData.fund.id,
          expectedFiscalYearId: testData.fiscalYears.first.id,
        });
      });
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          code: testData.fund.code,
          amount: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
        },
      ]);
      Invoices.openPageCurrentEncumbrance(`${testData.fund.name}(${testData.fund.code})`);
      Funds.selectPreviousBudgetDetails();
      BudgetDetails.waitLoading();
      BudgetDetails.checkBudgetDetails({
        information: [
          { key: BUDGET_DETAIL_FIELDS.BUDGET_NAME, value: testData.budget.name },
          { key: BUDGET_DETAIL_FIELDS.BUDGET_STATUS, value: BUDGET_STATUSES.CLOSED },
        ],
        summary: [{ key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' }],
      });
      Funds.viewTransactions();
      Transactions.waitLoading();
      Transactions.checkTransactionsList({
        records: [{ type: TRANSACTION_TYPES.ALLOCATION }, { type: TRANSACTION_TYPES.ENCUMBRANCE }],
      });
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PAYMENT);
      Funds.selectTransactionInList(TRANSACTION_TYPES.ENCUMBRANCE);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          {
            key: TRANSACTION_DETAIL_FIELDS.AMOUNT,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          {
            key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
      Transactions.closeTransactionsPage();
      Funds.closeBudgetDetails();
      Funds.selectBudgetDetails();
      BudgetDetails.waitLoading();
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' }],
      });
      Funds.viewTransactions();
      Transactions.waitLoading();
      Transactions.checkTransactionsList({
        records: [{ type: TRANSACTION_TYPES.ALLOCATION }, { type: TRANSACTION_TYPES.ENCUMBRANCE }],
      });
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PENDING_PAYMENT);
      Funds.checkNoTransactionOfType(TRANSACTION_TYPES.PAYMENT);
      Funds.selectTransactionInList(TRANSACTION_TYPES.ENCUMBRANCE);
      TransactionDetails.waitLoading();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          {
            key: TRANSACTION_DETAIL_FIELDS.AMOUNT,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
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
