import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets, FundDetails, Transactions } from '../../support/fragments/finance';
import TransactionDetails from '../../support/fragments/finance/transactions/transactionDetails';
import { InvoiceLineDetails, InvoiceView, Invoices } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import Organizations from '../../support/fragments/organizations/organizations';
import { Approvals } from '../../support/fragments/settings/invoices';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const isApprovePayEnabled = false;
  const testData = {
    order: {},
    fiscalYear: {},
    fund: {},
    user: {},
    invoice: {},
  };

  before(() => {
    cy.getAdminToken();
    const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });
    testData.fiscalYear = fiscalYear;
    testData.fund = fund;

    Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
      (orgResp) => {
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
          (locationResp) => {
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((amResp) => {
              cy.getBookMaterialType().then((mtypeResp) => {
                testData.order = {
                  ...NewOrder.getDefaultOngoingOrder({ vendorId: orgResp.id }),
                  reEncumber: true,
                  approved: true,
                };
                const orderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  cost: {
                    listUnitPrice: 20.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 20.0,
                  },
                  fundDistribution: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      value: 100,
                    },
                  ],
                  locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                  acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtypeResp.id,
                    materialSupplier: orgResp.id,
                    volumes: [],
                  },
                };

                Orders.createOrderViaApi(testData.order).then((orderResp) => {
                  testData.order.id = orderResp.id;
                  testData.orderNumber = orderResp.poNumber;
                  orderLine.purchaseOrderId = orderResp.id;

                  OrderLines.createOrderLineViaApi(orderLine);
                  Orders.updateOrderViaApi({
                    ...orderResp,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });

                  Invoices.createInvoiceWithInvoiceLineViaApi({
                    vendorId: orgResp.id,
                    fiscalYearId: testData.fiscalYear.id,
                    fundDistributions: orderLine.fundDistribution,
                    accountingCode: orgResp.erpCode,
                    releaseEncumbrance: true,
                    subTotal: 10,
                  }).then((invoiceResponse) => {
                    testData.invoice = invoiceResponse;

                    Invoices.changeInvoiceStatusViaApi({
                      invoice: invoiceResponse,
                      status: INVOICE_STATUSES.APPROVED,
                    });
                  });
                });
              });
            });
          },
        );
      },
    );
    Approvals.setApprovePayValue(isApprovePayEnabled);

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.uiInvoicesPayInvoices.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it('C3453 Pay invoice (thunderjet)', { tags: ['criticalPath', 'thunderjet', 'C3453'] }, () => {
    Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
    Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
    Invoices.waitLoading();
    Invoices.payInvoice();
    InvoiceView.verifyStatus(INVOICE_STATUSES.PAID);
    Invoices.selectInvoiceLine();
    InvoiceLineDetails.waitLoading();
    InvoiceLineDetails.openFundDetailsPane(testData.fund.name);
    FundDetails.waitLoading();

    const CurrentBudgetDetails = FundDetails.openCurrentBudgetDetails();
    CurrentBudgetDetails.waitLoading();
    CurrentBudgetDetails.clickViewTransactionsLink();
    Transactions.checkTransactionsList({
      records: [{ type: 'Payment' }],
      present: true,
    });
    Transactions.selectTransaction('Payment');
    TransactionDetails.waitLoading();
    TransactionDetails.checkTransactionDetails({
      fiscalYear: testData.fiscalYear.code,
      amount: '$10.00',
      source: testData.invoice.vendorInvoiceNo,
      type: 'Credit',
      fund: `${testData.fund.name} (${testData.fund.code})`,
    });
  });
});
