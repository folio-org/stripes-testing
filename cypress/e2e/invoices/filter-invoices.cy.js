import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import Invoices from '../../support/fragments/invoices/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';

describe('Invoices', () => {
  const testData = {};
  const order = {
    ...NewOrder.getDefaultOngoingOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = NewOrganization.getDefaultOrganization();
  const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');

  before(() => {
    cy.getAdminToken();
    const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });
    testData.fiscalYear = fiscalYear;
    testData.fund = fund;
    testData.budget = budget;

    cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((locationResp) => {
      cy.getBookMaterialType().then((mtypeResp) => {
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }).then((params) => {
          Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
            organization.id = responseOrganizations;
            order.vendor = organization.id;
            const orderLine = {
              ...BasicOrderLine.defaultOrderLine,
              cost: {
                listUnitPrice: 100.0,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
                poLineEstimatedPrice: 100.0,
              },
              fundDistribution: [
                { code: testData.fund.code, fundId: testData.fund.id, value: 100 },
              ],
              locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
              acquisitionMethod: params.body.acquisitionMethods[0].id,
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: mtypeResp.id,
                materialSupplier: responseOrganizations,
                volumes: [],
              },
            };
            Orders.createOrderViaApi(order).then((orderResponse) => {
              order.id = orderResponse.id;
              orderLine.purchaseOrderId = orderResponse.id;

              OrderLines.createOrderLineViaApi(orderLine);
              Orders.updateOrderViaApi({
                ...orderResponse,
                workflowStatus: ORDER_STATUSES.OPEN,
              });
              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: organization.id,
                fiscalYearId: testData.fiscalYear.id,
                poLineId: orderLine.id,
                fundDistributions: orderLine.fundDistribution,
                accountingCode: organization.erpCode,
                releaseEncumbrance: true,
                subTotal: 100,
              }).then((invoiceResponse) => {
                testData.invoice = invoiceResponse;

                Invoices.changeInvoiceStatusViaApi({
                  invoice: testData.invoice,
                  status: INVOICE_STATUSES.APPROVED,
                });
              });
            });
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiOrdersView.gui,
      Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  [
    {
      filterActions: () => {
        Invoices.selectStatusFilter('Approved');
      },
    },
    {
      filterActions: () => {
        Invoices.selectVendorFilter(organization);
      },
    },
    {
      filterActions: () => {
        Invoices.selectInvoiceDateFilter(todayDate, todayDate);
      },
    },
    {
      filterActions: () => {
        Invoices.selectApprovalDateFilter(todayDate, todayDate);
      },
    },
    {
      filterActions: () => {
        Invoices.selectFundCodeFilter(testData.fund.code);
      },
    },
    {
      filterActions: () => {
        Invoices.selectButchGroupFilter('FOLIO');
      },
    },
    {
      filterActions: () => {
        Invoices.selectFiscalYearFilter(testData.fiscalYear.code);
      },
    },
  ].forEach((filter) => {
    it(
      'C6724 Test the invoice filters (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C6724'] },
      () => {
        filter.filterActions();
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        Invoices.closeInvoiceDetailsPane();
        Invoices.resetFilters();
      },
    );
  });
});
