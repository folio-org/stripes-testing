import moment from 'moment';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import Invoices from '../../../support/fragments/invoices/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('Orders', () => {
  describe('Export', () => {
    const testData = {};
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const fileName = `order-export-${moment().format('YYYY-MM-DD')}-*.csv`;

    before(() => {
      cy.getAdminToken();
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      cy.getLocations({ limit: 1 }).then((locationResp) => {
        testData.location = locationResp;

        cy.getDefaultMaterialType().then((mtypes) => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((params) => {
            Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
              organization.id = responseOrganizations;
              order.vendor = organization.id;
              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                cost: {
                  listUnitPrice: 40.0,
                  currency: 'USD',
                  discountType: 'percentage',
                  quantityPhysical: 1,
                  poLineEstimatedPrice: 40.0,
                },
                fundDistribution: [
                  { code: testData.fund.code, fundId: testData.fund.id, value: 100 },
                ],
                locations: [{ locationId: testData.location.id, quantity: 1, quantityPhysical: 1 }],
                acquisitionMethod: params.body.acquisitionMethods[0].id,
                physical: {
                  createInventory: 'Instance, Holding, Item',
                  materialType: mtypes.id,
                  materialSupplier: responseOrganizations,
                  volumes: [],
                },
              };
              Orders.createOrderViaApi(order).then((orderResponse) => {
                order.id = orderResponse.id;
                orderLine.purchaseOrderId = orderResponse.id;
                testData.orderNumber = orderResponse.poNumber;

                OrderLines.createOrderLineViaApi(orderLine);
                Orders.updateOrderViaApi({
                  ...orderResponse,
                  workflowStatus: ORDER_STATUSES.OPEN,
                });
                Invoices.createInvoiceWithInvoiceLineViaApi({
                  vendorId: organization.id,
                  fiscalYearId: fiscalYear.id,
                  poLineId: orderLine.id,
                  fundDistributions: orderLine.fundDistribution,
                  accountingCode: organization.erpCode,
                  releaseEncumbrance: true,
                  subTotal: 40,
                }).then((invoiceResponse) => {
                  testData.invoice = invoiceResponse;
                  testData.invoice.vendorName = organization.name;

                  Invoices.changeInvoiceStatusViaApi({
                    invoice: testData.invoice,
                    status: INVOICE_STATUSES.PAID,
                  });
                });
              });
            });
          });
        });
      });

      cy.createTempUser([Permissions.uiExportOrders.gui, Permissions.uiOrdersView.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      FileManager.deleteFilesFromDownloadsByMask(fileName);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C196751 Export orders based on orders lines search (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C196751'] },
      () => {
        Orders.searchByParameter('PO line number', testData.orderNumber);
        OrderLines.resetFilters();
        OrderLines.selectFilterVendorPOL(testData.invoice);
        Orders.exportResultsToCsv();
        cy.wait(5000);
        OrderLines.checkDownloadedFile();
        OrderLines.resetFilters();
        OrderLines.selectFilterOngoingPaymentStatus();
        Orders.exportResultsToCsv();
        cy.wait(5000);
        OrderLines.checkDownloadedFile();
        OrderLines.resetFilters();
      },
    );
  });
});
