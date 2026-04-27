/* eslint-disable no-irregular-whitespace */
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ENCUMBRANCE_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import TransactionDetails from '../../support/fragments/finance/transactions/transactionDetails';
import { Transactions } from '../../support/fragments/finance';
import { Approvals } from '../../support/fragments/settings/invoices';

describe('Invoices', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    },
    order: {},
    orderLine: {},
    invoice: {},
    user: {},
    exchangeRate: 1.5,
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
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
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundResponse.fund.id,
            allocated: 1000,
          };

          return Budgets.createViaApi(budget).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });
  };

  const createOrderWithLine = (acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: ORDER_TYPES.ONE_TIME_API,
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = {
        ...BasicOrderLine.defaultOrderLine,
        purchaseOrderId: orderResponse.id,
        cost: {
          listUnitPrice: 20,
          currency: 'USD',
          quantityPhysical: 1,
          poLineEstimatedPrice: 20,
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

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
    });
  };

  const createInvoiceWithDifferentCurrency = (batchGroupId) => {
    return Invoices.createInvoiceViaApi({
      vendorId: testData.organization.id,
      fiscalYearId: testData.fiscalYear.id,
      batchGroupId,
      accountingCode: testData.organization.erpCode,
      invoiceStatus: INVOICE_STATUSES.OPEN,
    }).then((invoice) => {
      invoice.currency = 'UZS';
      invoice.exchangeRate = testData.exchangeRate;
      return Invoices.updateInvoiceViaApi(invoice).then(() => {
        testData.invoice = invoice;
      });
    });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;

      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        })
        .then((acquisitionMethod) => {
          return createOrderWithLine(acquisitionMethod.body.acquisitionMethods[0].id).then(() => {
            return cy.getBatchGroups().then((batchGroup) => {
              return createInvoiceWithDifferentCurrency(batchGroup.id);
            });
          });
        });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);
    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        return cy
          .createTempUser([
            Permissions.viewEditCreateInvoiceInvoiceLine.gui,
            Permissions.uiInvoicesApproveInvoices.gui,
            Permissions.uiInvoicesPayInvoices.gui,
            Permissions.uiFinanceViewFundAndBudget.gui,
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

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C411677 Invoice line can be created from PO line in different currency (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C411677'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [],
      });
      Invoices.createInvoiceLineFromPol(testData.order.poNumber);
      Invoices.handleDifferentCurrencyModal();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          {
            key: INVOICE_VIEW_FIELDS.SUB_TOTAL,
            value: `UZS ${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT,
            value: `UZS ${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice * testData.exchangeRate}.00`,
          },
        ],
        invoiceLines: [
          {
            poNumber: testData.order.poNumber,
            description: testData.orderLine.titleOrPackage,
            fundCode: testData.fund.code,
            subTotal: `UZS ${testData.orderLine.cost.poLineEstimatedPrice}.00`, // Non-breaking space is needed here
            total: `UZS ${testData.orderLine.cost.poLineEstimatedPrice}.00`, // Non-breaking space is needed here
          },
        ],
      });
      Invoices.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
        ],
      });
      Invoices.payInvoice();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          {
            key: INVOICE_VIEW_FIELDS.SUB_TOTAL,
            value: `UZS ${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT,
            value: `UZS ${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice * testData.exchangeRate}.00`,
          },
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.PAID },
          {
            key: INVOICE_LINE_VIEW_FIELDS.SUB_TOTAL,
            value: `UZS ${testData.orderLine.cost.poLineEstimatedPrice}.00`, // Non-breaking space is needed here
          },
        ],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          code: testData.fund.code,
          amount: `UZS ${testData.orderLine.cost.poLineEstimatedPrice}.00`, // Non-breaking space is needed here
          initialEncumbrance: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: '$0.00',
        },
      ]);
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: `${testData.orderLine.poLineNumber}` },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          {
            key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          {
            key: TRANSACTION_DETAIL_FIELDS.EXPENDED,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice * testData.exchangeRate}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
        ],
      });
      TransactionDetails.closeTransactionDetails();
      Transactions.selectTransaction(TRANSACTION_TYPES.PAYMENT);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
          {
            key: TRANSACTION_DETAIL_FIELDS.AMOUNT,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice * testData.exchangeRate}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.invoice.vendorInvoiceNo },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.PAYMENT },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
        ],
      });
    },
  );
});
