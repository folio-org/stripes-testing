import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import OrderDetails from '../../support/fragments/orders/orderDetails';

describe('Orders', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstOrder = {
    ...NewOrder.getDefaultOngoingOrder,
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
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let orderNumber;
  let user;
  let servicePointId;
  let location;
  let firstInvoice;
  let secondInvoice;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      secondBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);

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
                      Organizations.createOrganizationViaApi(organization).then(
                        (responseOrganizations) => {
                          organization.id = responseOrganizations;
                          firstOrder.vendor = organization.id;
                          const firstOrderLine = {
                            ...BasicOrderLine.defaultOrderLine,
                            cost: {
                              listUnitPrice: 15.0,
                              currency: 'USD',
                              discountType: 'percentage',
                              quantityPhysical: 1,
                              poLineEstimatedPrice: 15.0,
                            },
                            fundDistribution: [
                              { code: firstFund.code, fundId: firstFund.id, value: 70 },
                              { code: secondFund.code, fundId: secondFund.id, value: 30 },
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

                          Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                            firstOrder.id = firstOrderResponse.id;
                            firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                            orderNumber = firstOrderResponse.poNumber;
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
                              subTotal: 10.5,
                            }).then((invoiceRescponse) => {
                              firstInvoice = invoiceRescponse;

                              Invoices.changeInvoiceStatusViaApi({
                                invoice: firstInvoice,
                                status: INVOICE_STATUSES.PAID,
                              });
                            });
                            Invoices.createInvoiceWithInvoiceLineViaApi({
                              vendorId: organization.id,
                              fiscalYearId: firstFiscalYear.id,
                              poLineId: firstOrderLine.id,
                              fundDistributions: firstOrderLine.fundDistribution,
                              accountingCode: organization.erpCode,
                              releaseEncumbrance: true,
                              subTotal: -4.5,
                            }).then((secondInvoiceRescponse) => {
                              secondInvoice = secondInvoiceRescponse;

                              Invoices.changeInvoiceStatusViaApi({
                                invoice: secondInvoice,
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
    });

    cy.createTempUser([permissions.uiOrdersView.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C502982 "Total credited" field is displayed in "PO summary" accordion on order details pane (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C502982'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: 'Total expended', value: '$10.50' },
          { key: 'Total credited', value: '$4.50' },
        ],
      });
    },
  );
});
