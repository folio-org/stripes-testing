import moment from 'moment';
import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';

describe('Orders', () => {
  describe('Export', () => {
    const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultFund = { ...Funds.defaultUiFund };
    const defaultOrder = {
      ...NewOrder.defaultOneTimeOrder,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const firstBudget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    const fileName = `order-export-${moment().format('YYYY-MM-DD')}-*.csv`;
    let user;
    let firstOrderNumber;
    let servicePointId;
    let location;
    let firstInvoice;

    before(() => {
      cy.getAdminToken();
      FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
        firstFiscalYear.id = firstFiscalYearResponse.id;
        firstBudget.fiscalYearId = firstFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = firstFiscalYear.id;
        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          defaultFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(defaultFund).then((fundResponse) => {
            defaultFund.id = fundResponse.fund.id;
            firstBudget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(firstBudget);
            ServicePoints.getViaApi().then((servicePoint) => {
              servicePointId = servicePoint[0].id;
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                (res) => {
                  location = res;

                  MaterialTypes.createMaterialTypeViaApi(
                    MaterialTypes.getDefaultMaterialType(),
                  ).then((mtypes) => {
                    cy.getAcquisitionMethodsApi({
                      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                    }).then((params) => {
                      // Prepare 2 Open Orders for Rollover
                      Organizations.createOrganizationViaApi(organization).then(
                        (responseOrganizations) => {
                          organization.id = responseOrganizations;
                          defaultOrder.vendor = organization.id;
                          const firstOrderLine = {
                            ...BasicOrderLine.defaultOrderLine,
                            cost: {
                              listUnitPrice: 40.0,
                              currency: 'USD',
                              discountType: 'percentage',
                              quantityPhysical: 1,
                              poLineEstimatedPrice: 40.0,
                            },
                            fundDistribution: [
                              { code: defaultFund.code, fundId: defaultFund.id, value: 100 },
                            ],
                            locations: [
                              { locationId: location.id, quantity: 1, quantityPhysical: 1 },
                            ],
                            acquisitionMethod: params.body.acquisitionMethods[0].id,
                            physical: {
                              createInventory: 'Instance, Holding, Item',
                              materialType: mtypes.body.id,
                              materialSupplier: responseOrganizations,
                              volumes: [],
                            },
                          };
                          Orders.createOrderViaApi(defaultOrder).then((firstOrderResponse) => {
                            defaultOrder.id = firstOrderResponse.id;
                            firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                            firstOrderNumber = firstOrderResponse.poNumber;
                            OrderLines.createOrderLineViaApi(firstOrderLine);
                            Orders.updateOrderViaApi({
                              ...firstOrderResponse,
                              workflowStatus: ORDER_STATUSES.OPEN,
                            });
                            Invoices.createInvoiceWithInvoiceLineViaApi({
                              vendorId: organization.id,
                              fiscalYearId: firstFiscalYear.id,
                              poLineId: firstOrderLine.id,
                              fundDistributions: firstOrderLine.fundDistribution,
                              accountingCode: organization.erpCode,
                              releaseEncumbrance: true,
                              subTotal: 40,
                            }).then((invoiceRescponse) => {
                              firstInvoice = invoiceRescponse;
                              firstInvoice.vendorName = organization.name;

                              Invoices.changeInvoiceStatusViaApi({
                                invoice: firstInvoice,
                                status: INVOICE_STATUSES.PAID,
                              });
                            });
                          });
                        },
                      );
                    });
                  });
                },
              );
            });
          });
        });
      });
      cy.createTempUser([permissions.uiExportOrders.gui, permissions.uiOrdersView.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.orderLinesPath,
            waiter: OrderLines.waitLoading,
          });
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      FileManager.deleteFilesFromDownloadsByMask(fileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C196751 Export orders based on orders lines search (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
      () => {
        Orders.searchByParameter('PO line number', firstOrderNumber);
        cy.wait(5000);
        OrderLines.resetFilters();
        OrderLines.selectFilterVendorPOL(firstInvoice);
        Orders.exportResultsToCsv();
        OrderLines.checkDownloadedFile();
        OrderLines.resetFilters();
        cy.reload();
        OrderLines.selectFilterOngoingPaymentStatus();
        Orders.exportResultsToCsv();
        OrderLines.checkDownloadedFile();
        OrderLines.resetFilters();
      },
    );
  });
});
