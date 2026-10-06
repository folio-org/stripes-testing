import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { Invoices } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C409504_Organization_${getRandomPostfix()}`,
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C409504_Ledger_${getRandomPostfix()}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C409504_Fund_${getRandomPostfix()}`,
      ledgerId: testData.ledger.id,
    };
    testData.budget = {
      ...Budgets.getDefaultBudget(),
      fundId: testData.fund.id,
      allocated: 1000,
    };
    testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
    testData.orderLine = BasicOrderLine.getDefaultOrderLine({
      title: `AT_C409504_OrderLine_${getRandomPostfix()}`,
      listUnitPrice: 10,
      fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
    });
    testData.invoices = {
      first: {
        invoiceLine: {
          subTotal: 10,
          subscriptionInfo: `AT_C409504_SubscriptionInfo_first_${getRandomPostfix()}`,
          comment: `AT_C409504_Comment_first_${getRandomPostfix()}`,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: DateTools.addDays(7),
        },
      },
      second: {
        invoiceLine: {
          subTotal: 20,
          subscriptionInfo: `AT_C409504_SubscriptionInfo_second_${getRandomPostfix()}`,
          comment: `AT_C409504_Comment_second_${getRandomPostfix()}`,
          subscriptionStartDate: DateTools.addDays(1),
          subscriptionEndDate: DateTools.addDays(14),
        },
      },
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      testData.fiscalYear = fiscalYear;

      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({ ...testData.budget, fiscalYearId: fiscalYear.id });
    });
    Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
      testData.order = order;

      Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
    });
    cy.then(() => {
      Object.values(testData.invoices).forEach((invoiceData) => {
        Invoices.createInvoiceViaApi({
          vendorId: testData.organization.id,
          fiscalYearId: testData.fiscalYear.id,
          accountingCode: testData.organization.erpCode,
        }).then((invoice) => {
          invoiceData.invoice = invoice;

          Invoices.createInvoiceLineViaApi({
            ...Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              poLineId: testData.orderLine.id,
              fundDistributions: testData.orderLine.fundDistribution,
              subTotal: invoiceData.invoiceLine.subTotal,
              subscriptionInfo: invoiceData.invoiceLine.subscriptionInfo,
              subscriptionStart: DateTools.getFormattedDate({
                date: invoiceData.invoiceLine.subscriptionStartDate,
              }),
              subscriptionEnd: DateTools.getFormattedDate({
                date: invoiceData.invoiceLine.subscriptionEndDate,
              }),
            }),
            comment: invoiceData.invoiceLine.comment,
          }).then((invoiceLine) => {
            invoiceData.invoiceLine.invoiceLineNumber = invoiceLine.invoiceLineNumber;
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Object.values(testData.invoices).forEach(({ invoice }) => {
      Invoices.deleteInvoiceViaApi(invoice.id);
    });
    Orders.deleteOrderViaApi(testData.order.id);
    Budgets.deleteViaApi(testData.budget.id);
    Funds.deleteFundViaApi(testData.fund.id);
    Ledgers.deleteLedgerViaApi(testData.ledger.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C409504 Add columns to "Related invoices" accordion on purchase order details pane and "Related invoice lines" accordion on PO line (Poppy+ ) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C409504'] },
    () => {
      const { first, second } = testData.invoices;

      // Step 1: Navigate to Order from "Preconditions #1" details pane
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Check "Related invoices" accordion
      OrderDetails.checkRelatedInvoicesTableContent(
        [first, second].map(({ invoice, invoiceLine }) => ({
          invoiceNumber: invoice.folioInvoiceNo,
          fiscalYear: testData.fiscalYear.code,
          vendorCode: testData.organization.code,
          vendorInvoiceNumber: invoice.vendorInvoiceNo,
          status: invoice.status,
          invoiceAmount: `$${invoiceLine.subTotal.toFixed(2)}`,
        })),
      );

      // Step 3: Click on purchase order line record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);

      // Step 4: Check "Related invoice lines" accordion
      OrderLineDetails.checkRelatedInvoiceLinesTableContent(
        [first, second].map(({ invoice, invoiceLine }) => ({
          vendorInvoiceNo: invoice.vendorInvoiceNo,
          invoiceLineNumber: invoiceLine.invoiceLineNumber,
          fiscalYear: testData.fiscalYear.code,
          vendorCode: testData.organization.code,
          subscriptionStart: DateTools.getFormattedDate(
            { date: invoiceLine.subscriptionStartDate },
            'MM/DD/YYYY',
          ),
          subscriptionEnd: DateTools.getFormattedDate(
            { date: invoiceLine.subscriptionEndDate },
            'MM/DD/YYYY',
          ),
          subscriptionInfo: invoiceLine.subscriptionInfo,
          status: invoice.status,
          comment: invoiceLine.comment,
        })),
      );
    },
  );
});
