import { APPLICATION_NAMES, INVOICE_STATUSES, ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  Budgets,
  FinanceHelper,
  FundDetails,
  Funds,
  Transactions,
} from '../../support/fragments/finance';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { Approvals } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const invoiceLineAmount1 = 20;
  const invoiceLineAmount2 = 30;
  const invoiceLineAmount3 = invoiceLineAmount1 + invoiceLineAmount2;

  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    ledger: {},
    fundAlpha: {},
    fundBeta: {},
    budgetAlpha: {},
    budgetBeta: {},
    orders: [],
    orderLines: [],
    invoice: {},
    user: {},
    originalApprovalSettings: null,
  };

  before('Create test data', () => {
    cy.getAdminToken();

    const {
      fiscalYear,
      ledger,
      fund: fundAlpha,
      budget: budgetAlpha,
    } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });
    testData.fiscalYear = fiscalYear;
    testData.ledger = ledger;
    testData.fundAlpha = fundAlpha;
    testData.budgetAlpha = budgetAlpha;

    const fundBeta = { ...Funds.getDefaultFund(), ledgerId: ledger.id };
    testData.fundBeta = fundBeta;
    Funds.createViaApi(fundBeta).then((fundResponse) => {
      testData.fundBeta = fundResponse.fund;

      const budgetBeta = {
        ...Budgets.getDefaultBudget(),
        fiscalYearId: fiscalYear.id,
        fundId: fundResponse.fund.id,
        allocated: 100,
      };
      Budgets.createViaApi(budgetBeta);
      testData.budgetBeta = budgetBeta;
    });

    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      const fundDistributionAlpha = [{ code: fundAlpha.code, fundId: fundAlpha.id, value: 100 }];
      const fundDistributionBeta = [{ code: fundBeta.code, fundId: fundBeta.id, value: 100 }];

      const order1 = {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
        approved: true,
      };
      const orderLine1 = BasicOrderLine.getDefaultOrderLine({
        listUnitPrice: invoiceLineAmount1,
        fundDistribution: fundDistributionAlpha,
      });

      const order2 = {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
        approved: true,
      };
      const orderLine2 = BasicOrderLine.getDefaultOrderLine({
        listUnitPrice: invoiceLineAmount2,
        fundDistribution: fundDistributionAlpha,
      });

      const order3 = {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
        approved: true,
      };
      const orderLine3 = BasicOrderLine.getDefaultOrderLine({
        listUnitPrice: invoiceLineAmount3,
        fundDistribution: fundDistributionBeta,
      });

      Orders.createOrderWithOrderLineViaApi(order1, orderLine1).then((orderResponse1) => {
        testData.orders.push(orderResponse1);
        testData.orderLines.push(orderLine1);
        Orders.updateOrderViaApi({ ...orderResponse1, workflowStatus: ORDER_STATUSES.OPEN });

        Orders.createOrderWithOrderLineViaApi(order2, orderLine2).then((orderResponse2) => {
          testData.orders.push(orderResponse2);
          testData.orderLines.push(orderLine2);
          Orders.updateOrderViaApi({ ...orderResponse2, workflowStatus: ORDER_STATUSES.OPEN });

          Orders.createOrderWithOrderLineViaApi(order3, orderLine3).then((orderResponse3) => {
            testData.orders.push(orderResponse3);
            testData.orderLines.push(orderLine3);
            Orders.updateOrderViaApi({
              ...orderResponse3,
              workflowStatus: ORDER_STATUSES.OPEN,
            });

            cy.getBatchGroups().then(({ id: batchGroupId }) => {
              Invoices.createInvoiceViaApi({
                vendorId: testData.organization.id,
                fiscalYearId: fiscalYear.id,
                batchGroupId,
                accountingCode: testData.organization.erpCode,
              }).then((invoiceResponse) => {
                testData.invoice = invoiceResponse;

                OrderLines.getOrderLineViaApi({
                  query: `purchaseOrderId=="${orderResponse1.id}"`,
                }).then((lines1) => {
                  const invoiceLine1 = Invoices.getDefaultInvoiceLine({
                    invoiceId: invoiceResponse.id,
                    invoiceLineStatus: invoiceResponse.status,
                    poLineId: lines1[0].id,
                    fundDistributions: lines1[0].fundDistribution,
                    subTotal: invoiceLineAmount1,
                    accountingCode: testData.organization.erpCode,
                    releaseEncumbrance: true,
                  });
                  Invoices.createInvoiceLineViaApi(invoiceLine1);

                  OrderLines.getOrderLineViaApi({
                    query: `purchaseOrderId=="${orderResponse2.id}"`,
                  }).then((lines2) => {
                    const invoiceLine2 = Invoices.getDefaultInvoiceLine({
                      invoiceId: invoiceResponse.id,
                      invoiceLineStatus: invoiceResponse.status,
                      poLineId: lines2[0].id,
                      fundDistributions: lines2[0].fundDistribution,
                      subTotal: invoiceLineAmount2,
                      accountingCode: testData.organization.erpCode,
                      releaseEncumbrance: true,
                    });
                    Invoices.createInvoiceLineViaApi(invoiceLine2);

                    OrderLines.getOrderLineViaApi({
                      query: `purchaseOrderId=="${orderResponse3.id}"`,
                    }).then((lines3) => {
                      const invoiceLine3 = Invoices.getDefaultInvoiceLine({
                        invoiceId: invoiceResponse.id,
                        invoiceLineStatus: invoiceResponse.status,
                        poLineId: lines3[0].id,
                        fundDistributions: lines3[0].fundDistribution,
                        subTotal: invoiceLineAmount3,
                        accountingCode: testData.organization.erpCode,
                        releaseEncumbrance: true,
                      });
                      Invoices.createInvoiceLineViaApi(invoiceLine3);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    Approvals.getApprovalConfigViaApi().then((settings) => {
      testData.originalApprovalSettings = settings;
    });

    Approvals.setApprovePayValueViaApi(false);

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      Permissions.uiInvoicesPayInvoices.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();

    if (testData.originalApprovalSettings?.length > 0) {
      const originalValue = JSON.parse(testData.originalApprovalSettings[0].value);
      Approvals.setApprovePayValueViaApi(originalValue.isApprovePayEnabled);
    }

    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C357038 Pay Invoice with total value = 0 (one of the fund distribution has negative amount) (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C357038'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();

      const InvoiceLineDetailsPane = InvoiceView.selectInvoiceLine(2);
      InvoiceLineDetailsPane.waitLoading();

      const InvoiceLineEditForm = InvoiceLineDetailsPane.openInvoiceLineEditForm();

      InvoiceLineEditForm.setNegativeSubTotal(invoiceLineAmount3);

      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.waitLoading();

      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: 'Sub-total', value: '$0.00' },
          { key: 'Calculated total amount', value: '$0.00' },
        ],
      });

      const InvoiceLineDetailsAfterSave = InvoiceView.selectInvoiceLine(2);
      InvoiceLineDetailsAfterSave.waitLoading();
      InvoiceLineDetailsAfterSave.checkFundDistibutionTableContent([
        {
          name: testData.fundBeta.name,
          amount: `-$${invoiceLineAmount3}.00`,
        },
      ]);
      cy.go('back');
      InvoiceView.waitLoading();

      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.APPROVED }],
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      FinanceHelper.clickFundButton();
      FinanceHelper.searchByName(testData.fundAlpha.name);
      Funds.selectFund(testData.fundAlpha.name);
      FundDetails.waitLoading();

      FundDetails.viewTransactionsForCurrentBudget();
      Funds.verifyTransactionWithAmountExist('Pending payment', `($${invoiceLineAmount1}.00)`);
      Funds.verifyTransactionWithAmountExist('Pending payment', `($${invoiceLineAmount2}.00)`);
      Transactions.waitLoading();

      Transactions.closeTransactionsPage();

      FinanceHelper.searchByName(testData.fundBeta.name);
      Funds.selectFund(testData.fundBeta.name);
      FundDetails.waitLoading();

      FundDetails.viewTransactionsForCurrentBudget();
      Funds.verifyTransactionWithAmountExist('Pending payment', `$${invoiceLineAmount3}.00`);
      Transactions.waitLoading();

      cy.visit(TopMenu.invoicesPath);
      Invoices.waitLoading();
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();

      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      FinanceHelper.searchByName(testData.fundBeta.name);
      Funds.selectFund(testData.fundBeta.name);
      FundDetails.waitLoading();

      FundDetails.viewTransactionsForCurrentBudget();
      Transactions.checkTransactionsList({
        records: [{ type: 'Pending payment' }],
        present: false,
      });
      Transactions.checkTransactionsByTypeAndAmount({
        records: [{ type: 'Credit', amount: `$${invoiceLineAmount3}.00` }],
      });

      Transactions.closeTransactionsPage();

      FinanceHelper.searchByName(testData.fundAlpha.name);
      Funds.selectFund(testData.fundAlpha.name);
      FundDetails.waitLoading();

      FundDetails.viewTransactionsForCurrentBudget();
      Transactions.checkTransactionsList({
        records: [{ type: 'Pending payment' }],
        present: false,
      });
      Funds.verifyTransactionWithAmountExist('Payment', `($${invoiceLineAmount1}.00)`);
      Funds.verifyTransactionWithAmountExist('Payment', `($${invoiceLineAmount2}.00)`);
    },
  );
});
