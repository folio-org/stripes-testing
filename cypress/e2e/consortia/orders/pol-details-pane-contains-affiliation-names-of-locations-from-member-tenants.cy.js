import Permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLines from '../../../support/fragments/orders/orderLines';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';

describe('Orders', () => {
  describe('Consortium (Orders)', () => {
    const randomPostfix = getRandomPostfix();
    const instancePrefix = `C411683-B Instance ${randomPostfix}`;
    const subjectPrefix = `C411683-B Subject ${randomPostfix}`;
    const testData = {
      collegeHoldings: [],
      universityHoldings: [],
      sharedInstance: {
        title: `${instancePrefix} Shared`,
        subjects: [{ value: `${subjectPrefix} 1` }, { value: `${subjectPrefix} 2` }],
      },
      sharedAccordionName: 'Shared',
      subjectBrowseoption: 'Subjects',
      user: {},
    };
    const firstOrder = {
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
    let firstOrderNumber;

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
                                  firstOrder.vendor = organization.id;
                                  const firstOrderLine = {
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
                                  Orders.createOrderViaApi(firstOrder).then(
                                    (firstOrderResponse) => {
                                      firstOrder.id = firstOrderResponse.id;
                                      firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                                      firstOrderNumber = firstOrderResponse.poNumber;
                                      OrderLines.createOrderLineViaApi(firstOrderLine);
                                    },
                                  );
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
      Orders.deleteOrderViaApi(firstOrder.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      cy.resetTenant();
      cy.getAdminToken();
    });

    it(
      'C477645 PO line details pane contains affiliation names of locations from Member tenants (consortia) (thunderjet)',
      { tags: ['smokeECS', 'thunderjet', 'C477645'] },
      () => {
        Orders.searchByParameter('PO number', firstOrderNumber);
        Orders.selectFromResultsList(firstOrderNumber);
        OrderLines.selectPOLInOrder();
      },
    );
  });
});
