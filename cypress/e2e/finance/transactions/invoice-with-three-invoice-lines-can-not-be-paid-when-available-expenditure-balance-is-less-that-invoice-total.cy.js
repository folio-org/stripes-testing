import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { Budgets, FundDetails, Funds } from '../../../support/fragments/finance';
import Transactions from '../../../support/fragments/finance/transactions/transactions';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { Approvals } from '../../../support/fragments/settings/invoices';
import OrderLinesLimit from '../../../support/fragments/settings/orders/orderLinesLimit';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Transactions', () => {
    const organization = NewOrganization.getDefaultOrganization();
    const testData = {
      fiscalYear: {},
      fund: {},
      budget: {},
      organization,
      order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
      invoice: {},
      user: {},
    };

    before(() => {
      cy.getAdminToken();
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictEncumbrance: false, restrictExpenditures: true },
        budget: { allocated: 100, allowableEncumbrance: 100, allowableExpenditure: 100 },
      });
      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      cy.getBatchGroups().then((batchGroup) => {
        testData.invoice.batchGroup = batchGroup.name;
      });
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResponse) => {
          cy.getBookMaterialType().then((mtype) => {
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((params) => {
              Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
                testData.organization.id = responseOrganizations;

                OrderLinesLimit.setPOLLimitViaApi(3);
                const firstOrderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  cost: {
                    listUnitPrice: 95,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 95,
                  },
                  fundDistribution: [
                    { code: testData.fund.code, fundId: testData.fund.id, value: 100 },
                  ],
                  locations: [
                    { locationId: locationResponse.id, quantity: 1, quantityPhysical: 1 },
                  ],
                  acquisitionMethod: params.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtype.id,
                    materialSupplier: testData.organization.id,
                    volumes: [],
                  },
                };
                const secondOrderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  id: uuid(),
                  cost: {
                    listUnitPrice: 10.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 10.0,
                  },
                  fundDistribution: [
                    { code: testData.fund.code, fundId: testData.fund.id, value: 100 },
                  ],
                  locations: [
                    { locationId: locationResponse.id, quantity: 1, quantityPhysical: 1 },
                  ],
                  acquisitionMethod: params.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtype.id,
                    materialSupplier: testData.organization.id,
                    volumes: [],
                  },
                };
                const thirdOrderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  id: uuid(),
                  cost: {
                    listUnitPrice: 5.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 5.0,
                  },
                  fundDistribution: [
                    { code: testData.fund.code, fundId: testData.fund.id, value: 100 },
                  ],
                  locations: [
                    { locationId: locationResponse.id, quantity: 1, quantityPhysical: 1 },
                  ],
                  acquisitionMethod: params.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtype.id,
                    materialSupplier: testData.organization.id,
                    volumes: [],
                  },
                };
                Orders.createOrderViaApi(testData.order)
                  .then((orderResponse) => {
                    testData.order.id = orderResponse.id;
                    firstOrderLine.purchaseOrderId = orderResponse.id;
                    secondOrderLine.purchaseOrderId = orderResponse.id;
                    thirdOrderLine.purchaseOrderId = orderResponse.id;
                    testData.orderNumber = orderResponse.poNumber;

                    OrderLines.createOrderLineViaApi(firstOrderLine);
                    OrderLines.createOrderLineViaApi(secondOrderLine);
                    OrderLines.createOrderLineViaApi(thirdOrderLine);

                    Orders.updateOrderViaApi({
                      ...orderResponse,
                      workflowStatus: ORDER_STATUSES.OPEN,
                    });
                  })
                  .then(() => {
                    OrderLines.getOrderLineViaApi({
                      query: `purchaseOrderId=="${testData.order.id}"`,
                    }).then((orderLines) => {
                      testData.orderLines = orderLines;
                      cy.getBatchGroups().then((batchGroup) => {
                        Invoices.createInvoiceViaApi({
                          vendorId: testData.organization.id,
                          fiscalYearId: testData.fiscalYear.id,
                          batchGroupId: batchGroup.id,
                          accountingCode: testData.organization.erpCode,
                        }).then((invoiceResponse) => {
                          testData.invoice = invoiceResponse;

                          orderLines.forEach((orderLine) => {
                            const invoiceLine = Invoices.getDefaultInvoiceLine({
                              invoiceId: invoiceResponse.id,
                              invoiceLineStatus: 'Open',
                              poLineId: orderLine.id,
                              fundDistributions: orderLine.fundDistribution,
                              subTotal: orderLine.cost.poLineEstimatedPrice,
                              accountingCode: testData.organization.erpCode,
                              releaseEncumbrance: true,
                            });
                            Invoices.createInvoiceLineViaApi(invoiceLine);
                          });
                        });
                      });
                    });
                  });
              });
            });
          });
        },
      );
      Approvals.setApprovePayValueViaApi(true);

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

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
    });

    it(
      'C449373 Invoice with three invoice lines can NOT be paid when available expenditure balance is less that invoice total (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C449373'] },
      () => {
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        InvoiceView.checkInvoiceDetails({
          invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
        });
        Invoices.canNotApproveAndPayInvoice(testData.fund);
        InvoiceView.checkInvoiceDetails({
          invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
        });
        [
          {
            lineIndex: 0,
            value: `${testData.orderLines[0].cost.poLineEstimatedPrice}.00`,
          },
          {
            lineIndex: 1,
            value: `${testData.orderLines[1].cost.poLineEstimatedPrice}.00`,
          },
          {
            lineIndex: 2,
            value: `${testData.orderLines[2].cost.poLineEstimatedPrice}.00`,
          },
        ].forEach(({ lineIndex, value }) => {
          InvoiceView.selectInvoiceLine(lineIndex);
          InvoiceLineDetails.checkFundDistibutionTableContent([
            {
              name: testData.fund.name,
              currentEncumbrance: value,
            },
          ]);
          InvoiceLineDetails.openFundDetailsPane(testData.fund.name);
          Funds.waitLoading();
          FundDetails.viewTransactionsForCurrentBudget();
          ['Pending payment', 'Payment'].forEach((transactionType) => {
            Transactions.checkTransactionsList({
              records: [{ type: transactionType }],
              present: false,
            });
          });
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
          Invoices.waitLoading();
          Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
          Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        });
      },
    );
  });
});
