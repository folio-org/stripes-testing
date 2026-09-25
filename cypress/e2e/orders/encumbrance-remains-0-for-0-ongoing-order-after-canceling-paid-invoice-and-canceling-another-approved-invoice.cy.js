import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ENCUMBRANCE_STATUSES,
  FINANCIAL_ACTIVITY_OVERRAGES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { BudgetDetails, Budgets, Funds, TransactionDetails } from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  describe('Order lines', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYear: {},
      fund: {},
      budget: {},
      acquisitionMethodId: null,
      order: {},
      orderLine: {},
      invoices: {},
      user: {},
    };

    const createBudgetWithFundLedgerAndFiscalYear = () => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        budget: { allocated: 1000 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const getAcquisitionMethodId = () => {
      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethodId = body.acquisitionMethods[0].id;
        });
    };

    const createOpenOngoingOrderWithLine = () => {
      return getAcquisitionMethodId()
        .then(() => {
          return Orders.createOrderViaApi(
            NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
          );
        })
        .then((order) => {
          testData.order = order;

          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 0,
              poLineEstimatedPrice: 0,
              fundDistribution: [
                {
                  code: testData.fund.code,
                  fundId: testData.fund.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
            }),
          );
        })
        .then((orderLine) => {
          testData.orderLine = orderLine;

          return Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
    };

    const createInvoice = ({ invoiceKey, subTotal, invoiceStatus }) => {
      return OrderLines.getOrderLineByIdViaApi(testData.orderLine.id)
        .then((orderLine) => {
          return Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: testData.organization.id,
            accountingCode: testData.organization.erpCode,
            poLineId: orderLine.id,
            fundDistributions: orderLine.fundDistribution,
            invoiceStatus: INVOICE_STATUSES.OPEN,
            subTotal,
            releaseEncumbrance: false,
            exportToAccounting: false,
          });
        })
        .then((invoice) => {
          testData.invoices[invoiceKey] = invoice;

          return Invoices.changeInvoiceStatusViaApi({ invoice, status: invoiceStatus });
        });
    };

    const createInvoices = () => {
      return createInvoice({
        invoiceKey: 'first',
        subTotal: 5,
        invoiceStatus: INVOICE_STATUSES.APPROVED,
      }).then(() => {
        return createInvoice({
          invoiceKey: 'second',
          subTotal: 20,
          invoiceStatus: INVOICE_STATUSES.PAID,
        });
      });
    };

    const cancelSecondInvoice = () => {
      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.invoices.second,
        status: INVOICE_STATUSES.CANCELLED,
      });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
          Permissions.uiOrdersView.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceUnreleaseEncumbrance.gui,
          Permissions.uiInvoicesCancelInvoices.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(createBudgetWithFundLedgerAndFiscalYear)
        .then(createOrganization)
        .then(createOpenOngoingOrderWithLine)
        .then(createInvoices)
        .then(cancelSecondInvoice)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C844263 Encumbrance remains 0 for an $0 Ongoing order after canceling a paid invoice and canceling another approved invoice (release encumbrance = false) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C844263'] },
      () => {
        // Step 1: Open the order
        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 2: Open the PO line
        OrderDetails.selectPOLInOrder();
        OrderLineDetails.waitLoading();
        OrderLineDetails.checkFundDistibutionTableContent([
          { name: testData.fund.name, initialEncumbrance: '$0.00', currentEncumbrance: '$0.00' },
        ]);

        // Step 3: Open the encumbrance from the PO line
        OrderLineDetails.openEncumbrancePane(testData.fund.name);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$5.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
          ],
        });

        // Step 4: Check the current budget of Fund A
        Funds.closeBudgetTransactionApp(testData.budget.name);
        BudgetDetails.checkBudgetDetails({
          summary: [
            { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: '$5.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: '$5.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: '$0.00' },
          ],
          balance: { available: '$995.00' },
        });

        // Step 5: Cancel Invoice #1
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.selectInvoiceByNumber(testData.invoices.first.vendorInvoiceNo);
        InvoiceView.cancelInvoice();
        InvoiceView.checkInvoiceDetails({
          title: testData.invoices.first.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
          ],
        });

        // Step 6: Open the encumbrance from the invoice line of Invoice #1
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fund.name, currentEncumbrance: '$0.00' },
        ]);
        InvoiceLineDetails.openEncumbrancePane();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
          ],
        });

        // Step 7: Check the current budget of Fund A
        Funds.closeBudgetTransactionApp(testData.budget.name);
        BudgetDetails.checkBudgetDetails({
          summary: [
            { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: '$0.00' },
          ],
          balance: { available: '$1,000.00' },
        });
      },
    );
  });
});
