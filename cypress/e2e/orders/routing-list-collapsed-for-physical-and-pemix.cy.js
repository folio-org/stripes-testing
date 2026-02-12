import permissions from '../../support/dictionary/permissions';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../support/constants';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';

describe('ui-orders: Orders and Order lines', () => {
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

          Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
            organization.id = responseOrganizations;
            firstOrder.vendor = organization.id;
            secondOrder.vendor = organization.id;

            MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
              (mtypes) => {
                materialType = mtypes.body;
                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                }).then((params) => {
                  const firstOrderLine = {
                    ...BasicOrderLine.getDefaultOrderLine(),
                    orderFormat: 'Physical Resource',
                    cost: {
                      listUnitPrice: 10.0,
                      currency: 'USD',
                      discountType: 'percentage',
                      quantityPhysical: 1,
                      poLineEstimatedPrice: 10.0,
                    },
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

                  Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                    firstOrder.id = firstOrderResponse.id;
                    firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                    firstOrderNumber = firstOrderResponse.poNumber;

                    OrderLines.createOrderLineViaApi(firstOrderLine).then(() => {
                      const secondOrderLine = {
                        ...BasicOrderLine.getDefaultOrderLine(),
                        orderFormat: 'P/E Mix',
                        cost: {
                          listUnitPrice: 10.0,
                          listUnitPriceElectronic: 10.0,
                          currency: 'USD',
                          discountType: 'percentage',
                          quantityPhysical: 1,
                          quantityElectronic: 1,
                        },
                        locations: [
                          {
                            locationId: location.id,
                            quantityPhysical: 1,
                            quantityElectronic: 0,
                          },
                          {
                            locationId: location.id,
                            quantityPhysical: 0,
                            quantityElectronic: 1,
                          },
                        ],
                        acquisitionMethod: params.body.acquisitionMethods[0].id,
                        physical: {
                          createInventory: 'Instance, Holding',
                          materialType: mtypes.body.id,
                        },
                        eresource: {
                          createInventory: 'Instance',
                          accessProvider: responseOrganizations,
                        },
                      };

                      Orders.createOrderViaApi(secondOrder).then((secondOrderResponse) => {
                        secondOrder.id = secondOrderResponse.id;
                        secondOrderLine.purchaseOrderId = secondOrderResponse.id;
                        secondOrderNumber = secondOrderResponse.poNumber;

                        OrderLines.createOrderLineViaApi(secondOrderLine).then(() => {
                          cy.createTempUser([
                            permissions.uiOrdersView.gui,
                            permissions.uiNotesItemView.gui,
                            permissions.uiSettingsOrdersCanViewAllSettings.gui,
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
              },
            );
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
    NewLocation.deleteViaApi(location.id);
    MaterialTypes.deleteViaApi(materialType.id);
  });

  it(
    'C466242 "Routing lists" accordion is collapsed when PO line does not have related Routing lists and Order format = "Physical Resource" or "P/E Mix" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C466242'] },
    () => {
      Orders.searchByParameter('PO number', firstOrderNumber);
      Orders.selectFromResultsList(firstOrderNumber);
      cy.wait(4000);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkRoutingListSectionPresence();
      OrderLineDetails.checkRoutingListSectionCollapsed();
      OrderLineDetails.checkRoutingListSectionCounter('0');

      OrderLineDetails.expandRoutingListSection();
      OrderLineDetails.checkRoutingListSectionExpanded();
      OrderLineDetails.checkNoRoutingListsText();

      Orders.resetFilters();
      Orders.searchByParameter('PO number', secondOrderNumber);
      Orders.selectFromResultsList(secondOrderNumber);
      cy.wait(2000);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkRoutingListSectionPresence();
      OrderLineDetails.checkRoutingListSectionCollapsed();
      OrderLineDetails.checkRoutingListSectionCounter('0');

      OrderLineDetails.expandRoutingListSection();
      OrderLineDetails.checkRoutingListSectionExpanded();
      OrderLineDetails.checkNoRoutingListsText();
    },
  );
});
