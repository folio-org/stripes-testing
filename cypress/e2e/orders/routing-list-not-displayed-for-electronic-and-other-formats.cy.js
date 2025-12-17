import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../support/constants';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';

describe('ui-orders: Orders and Order lines', () => {
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const firstOrder = {
    ...NewOrder.getDefaultOngoingOrder({ orderType: 'One-Time' }),
    approved: true,
  };
  const secondOrder = {
    ...NewOrder.getDefaultOngoingOrder({ orderType: 'One-Time' }),
    approved: true,
  };
  let user;
  let firstOrderNumber;
  let secondOrderNumber;
  let location;
  let servicePointId;
  let materialType;

  before('Create user, data', () => {
    cy.getAdminToken();
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
        (locationRes) => {
          location = locationRes;

          FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
            defaultFiscalYear.id = firstFiscalYearResponse.id;
            firstBudget.fiscalYearId = firstFiscalYearResponse.id;
            defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

            Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
              defaultLedger.id = ledgerResponse.id;
              defaultFund.ledgerId = defaultLedger.id;

              Funds.createViaApi(defaultFund).then((fundResponse) => {
                defaultFund.id = fundResponse.fund.id;
                firstBudget.fundId = fundResponse.fund.id;

                Budgets.createViaApi(firstBudget).then(() => {
                  Organizations.createOrganizationViaApi(organization).then(
                    (responseOrganizations) => {
                      organization.id = responseOrganizations;
                      firstOrder.vendor = organization.id;
                      secondOrder.vendor = organization.id;

                      MaterialTypes.createMaterialTypeViaApi(
                        MaterialTypes.getDefaultMaterialType(),
                      ).then((mtypes) => {
                        materialType = mtypes.body;
                        cy.getAcquisitionMethodsApi({
                          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                        }).then((params) => {
                          // eslint-disable-next-line no-unused-vars
                          const { physical, ...orderLineWithoutPhysical } =
                            BasicOrderLine.getDefaultOrderLine();

                          const firstOrderLine = {
                            ...orderLineWithoutPhysical,
                            acquisitionMethod: params.body.acquisitionMethods[0].id,
                            orderFormat: 'Electronic Resource',
                            cost: {
                              listUnitPriceElectronic: 10.0,
                              currency: 'USD',
                              discountType: 'percentage',
                              quantityElectronic: 1,
                            },
                            fundDistribution: [
                              { code: defaultFund.code, fundId: defaultFund.id, value: 100 },
                            ],
                            locations: [
                              {
                                locationId: location.id,
                                quantity: 1,
                                quantityElectronic: 1,
                              },
                            ],
                            eresource: {
                              createInventory: 'Instance, Holding',
                              materialType: mtypes.body.id,
                            },
                          };

                          Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                            firstOrder.id = firstOrderResponse.id;
                            firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                            firstOrderNumber = firstOrderResponse.poNumber;

                            OrderLines.createOrderLineViaApi(firstOrderLine).then(() => {
                              const secondOrderLine = {
                                ...BasicOrderLine.getDefaultOrderLine(),
                                orderFormat: 'Other',
                                cost: {
                                  listUnitPrice: 10.0,
                                  currency: 'USD',
                                  discountType: 'percentage',
                                  quantityPhysical: 1,
                                  poLineEstimatedPrice: 10.0,
                                },
                                fundDistribution: [
                                  { code: defaultFund.code, fundId: defaultFund.id, value: 100 },
                                ],
                                locations: [
                                  {
                                    locationId: location.id,
                                    quantity: 1,
                                    quantityPhysical: 1,
                                  },
                                ],
                                acquisitionMethod: params.body.acquisitionMethods[0].id,
                                physical: {
                                  createInventory: 'Instance, Holding',
                                  materialType: mtypes.body.id,
                                  materialSupplier: responseOrganizations,
                                  volumes: [],
                                },
                              };

                              Orders.createOrderViaApi(secondOrder).then((secondOrderResponse) => {
                                secondOrder.id = secondOrderResponse.id;
                                secondOrderLine.purchaseOrderId = secondOrderResponse.id;
                                secondOrderNumber = secondOrderResponse.poNumber;

                                OrderLines.createOrderLineViaApi(secondOrderLine).then(() => {
                                  cy.createTempUser([
                                    permissions.uiOrdersView.gui,
                                    permissions.uiOrdersEdit.gui,
                                  ]).then((userProperties) => {
                                    user = userProperties;

                                    cy.login(userProperties.username, userProperties.password, {
                                      path: TopMenu.ordersPath,
                                      waiter: Orders.waitLoading,
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
                });
              });
            });
          });
        },
      );
    });
  });

  after('Delete user, data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Orders.deleteOrderViaApi(firstOrder.id);
    Orders.deleteOrderViaApi(secondOrder.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Budgets.deleteViaApi(firstBudget.id);
    Funds.deleteFundViaApi(defaultFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    NewLocation.deleteViaApi(location.id);
    MaterialTypes.deleteViaApi(materialType.id);
  });

  it(
    'C466239 "Routing lists" accordion is not displayed when Order format = "Electronic Resource" or "Other" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466239'] },
    () => {
      Orders.searchByParameter('PO number', firstOrderNumber);
      Orders.selectFromResultsList(firstOrderNumber);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.checkRoutingListSectionPresence(false);

      Orders.resetFilters();
      Orders.searchByParameter('PO number', secondOrderNumber);
      Orders.selectFromResultsList(secondOrderNumber);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.checkRoutingListSectionPresence(false);
    },
  );
});
