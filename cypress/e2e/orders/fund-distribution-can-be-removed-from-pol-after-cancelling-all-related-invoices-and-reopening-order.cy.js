import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_VIEW_FIELD_LABELS,
  TRANSACTION_TOOLTIPS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FundDetails,
  Funds,
  Transactions,
} from '../../support/fragments/finance';
import { Invoices } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

// Amounts of the invoices paid in each of two cycles: a payment, a credit and a payment
const INVOICE_AMOUNTS = [5, -1, 3];

describe('Orders', () => {
  describe('Order lines', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYear: {},
      fund: {},
      acquisitionMethodId: null,
      order: {},
      orderLine: {},
      invoices: [],
      user: {},
    };

    const createBudgetWithFundLedgerAndFiscalYear = () => {
      const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        budget: { allocated: 1000 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
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
              listUnitPrice: 10,
              poLineEstimatedPrice: 10,
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

    const createAndPayInvoiceForOrderLine = (subTotal) => {
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
          testData.invoices.push({ ...invoice, subTotal });

          return Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.PAID });
        });
    };

    const createAndPayInvoices = () => {
      return cy.then(() => {
        INVOICE_AMOUNTS.forEach((amount) => createAndPayInvoiceForOrderLine(amount));
      });
    };

    const cancelInvoices = (invoiceNumbers) => {
      return cy.then(() => {
        invoiceNumbers.forEach((invoiceNumber) => {
          Invoices.changeInvoiceStatusViaApi({
            invoice: testData.invoices[invoiceNumber - 1],
            status: INVOICE_STATUSES.CANCELLED,
          });
        });
      });
    };

    const cancelAndReopenOrder = () => {
      return Orders.getOrderByIdViaApi(testData.order.id)
        .then((order) => {
          return Orders.updateOrderViaApi({
            ...order,
            workflowStatus: ORDER_STATUSES.CLOSED,
            closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
          });
        })
        .then(() => Orders.getOrderByIdViaApi(testData.order.id))
        .then((order) => {
          return Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiFinanceViewFundAndBudget.gui])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
          Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(createBudgetWithFundLedgerAndFiscalYear)
        .then(createOrganization)
        .then(createOpenOngoingOrderWithLine)
        .then(createAndPayInvoices)
        .then(() => cancelInvoices([1]))
        .then(cancelAndReopenOrder)
        .then(() => cancelInvoices([2, 3]))
        .then(createAndPayInvoices)
        .then(() => cancelInvoices([4]))
        .then(cancelAndReopenOrder)
        .then(() => cancelInvoices([5, 6]))
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C926164 Fund distribution can be removed from the POL after cancelling all related invoices and reopening the order (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C926164'] },
      () => {
        // Step 1: Open the order
        Orders.selectFromResultsList(testData.order.poNumber);
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$10.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$10.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 2: Open PO line edit form
        OrderDetails.selectPOLInOrder();
        OrderLineDetails.waitLoading();
        OrderLineDetails.openOrderLineEditForm();

        // Step 3: Remove Fund A from the PO line
        OrderLineEditForm.deleteFundDistribution({ index: 0 });
        OrderLineEditForm.clickSaveButton();
        OrderLineDetails.waitLoading();
        OrderLineDetails.checkFundDistibutionTableContent([]);

        // Step 4: Check transactions of the current budget of Fund A
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
        FinanceHelper.selectFundsNavigation();
        FinanceHelper.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);
        FundDetails.viewTransactionsForCurrentBudget();
        // Transactions are listed from the newest one, so the last paid invoice is in the first row
        [...testData.invoices].reverse().forEach(({ subTotal }, rowIndex) => {
          Transactions.checkVoidedTransactionInList({
            amount: `$${Math.abs(subTotal)}.00`,
            rowIndex,
            tooltipText: TRANSACTION_TOOLTIPS.VOIDED_TRANSACTION,
          });
        });
        Transactions.checkTransactionsList({
          records: [{ type: TRANSACTION_TYPES.ENCUMBRANCE }],
          present: false,
        });
      },
    );
  });
});
