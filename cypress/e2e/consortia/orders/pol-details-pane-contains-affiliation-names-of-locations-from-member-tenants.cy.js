import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../../support/fragments/orders/orderLines';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Consortium (Orders)', () => {
    const testData = {
      user: {},
    };
    const order = {
      ...NewOrder.getDefaultOngoingOrder,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    let centralLocation;
    let collegeLocation;
    let univercityLocation;
    let servicePointId;
    let orderNumber;

    before('Create user, data', () => {
      cy.getAdminToken();
      ServicePoints.getViaApi().then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId))
          .then((centralLocationRes) => {
            centralLocation = centralLocationRes;

            cy.createTempUser([
              Permissions.uiOrdersView.gui,
              Permissions.settingsConsortiaCanViewNetworkOrdering.gui,
            ]).then((userProperties) => {
              testData.userProperties = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
              cy.assignAffiliationToUser(Affiliations.University, testData.userProperties.userId);

              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
              ServicePoints.getViaApi().then((collegeServicePoint) => {
                servicePointId = collegeServicePoint[0].id;
                NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                  (collegeLocationRes) => {
                    collegeLocation = collegeLocationRes;

                    cy.setTenant(Affiliations.University);
                    cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
                      Permissions.uiInventoryViewInstances.gui,
                    ]);
                    ServicePoints.getViaApi().then((univercityServicePoint) => {
                      servicePointId = univercityServicePoint[0].id;
                      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                        (univercityLocationRes) => {
                          univercityLocation = univercityLocationRes;

                          cy.setTenant(Affiliations.Consortia);
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
                                  order.vendor = organization.id;
                                  const orderLine = {
                                    ...BasicOrderLine.defaultOrderLine,
                                    cost: {
                                      listUnitPrice: 10.0,
                                      currency: 'USD',
                                      discountType: 'percentage',
                                      quantityPhysical: 3,
                                      poLineEstimatedPrice: 10.0,
                                    },
                                    fundDistribution: [],
                                    locations: [
                                      {
                                        locationId: centralLocation.id,
                                        quantity: 1,
                                        quantityPhysical: 1,
                                      },
                                      {
                                        locationId: collegeLocation.id,
                                        quantity: 1,
                                        quantityPhysical: 1,
                                      },
                                      {
                                        locationId: univercityLocation.id,
                                        quantity: 1,
                                        quantityPhysical: 1,
                                      },
                                    ],
                                    acquisitionMethod: params.body.acquisitionMethods[0].id,
                                    physical: {
                                      createInventory: 'Instance, Holding, Item',
                                      materialType: mtypes.body.id,
                                      materialSupplier: responseOrganizations,
                                      volumes: [],
                                    },
                                  };
                                  Orders.createOrderViaApi(order).then((orderResponse) => {
                                    order.id = orderResponse.id;
                                    orderLine.purchaseOrderId = orderResponse.id;
                                    orderNumber = orderResponse.poNumber;
                                    OrderLines.createOrderLineViaApi(orderLine);
                                  });
                                },
                              );
                            });
                          });
                        },
                      );
                    });
                  },
                );
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
          });
      });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      Orders.deleteOrderViaApi(order.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      cy.resetTenant();
      cy.getAdminToken();
    });

    it(
      'C477645 PO line details pane contains affiliation names of locations from Member tenants (consortia) (thunderjet)',
      { tags: ['smokeECS', 'thunderjet', 'C477645'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.selectPOLInOrder();
      },
    );
  });
});
