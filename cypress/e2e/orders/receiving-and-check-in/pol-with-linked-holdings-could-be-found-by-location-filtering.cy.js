import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { BasicOrderLine, NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const organization = NewOrganization.getDefaultOrganization();
    const testData = {
      organization,
    };
    const orders = {
      first: {
        id: uuid(),
        ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
        orderType: 'One-Time',
        approved: true,
      },
      second: {
        id: uuid(),
        ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
        orderType: 'One-Time',
        approved: true,
      },
      third: {
        id: uuid(),
        ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
        orderType: 'One-Time',
        approved: true,
      },
      fourth: {
        id: uuid(),
        ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
        orderType: 'One-Time',
        approved: true,
      },
    };

    before(() => {
      cy.getAdminToken();
      ServicePoints.getViaApi()
        .then((servicePoint) => {
          testData.servicePointId = servicePoint[0].id;

          NewLocation.createViaApi(NewLocation.getDefaultLocation(testData.servicePointId)).then(
            (locationResponse) => {
              testData.location = locationResponse;

              cy.getBookMaterialType().then((mtypeResponse) => {
                testData.materialTypeId = mtypeResponse.id;

                // create instance, holdings and item
                InventoryInstances.createFolioInstancesViaApi({
                  folioInstances: InventoryInstances.generateFolioInstances({
                    itemsProperties: { materialType: { id: testData.materialTypeId } },
                  }),
                  location: { id: testData.location.id, name: testData.location.name },
                }).then((instanceResponse) => {
                  testData.instance = instanceResponse;
                });
              });
            },
          );
        })
        .then(() => {
          Organizations.createOrganizationViaApi(organization).then((orgResponse) => {
            organization.id = orgResponse;

            const firstOrderLine = {
              ...BasicOrderLine.defaultOrderLine,
              id: uuid(),
              instanceId: testData.instance.instanceId,
              cost: {
                listUnitPrice: 10,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
              },
              orderFormat: 'Other',
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: testData.materialTypeId,
              },
              locations: [{ locationId: testData.location.id, quantityPhysical: 1 }],
            };
            const secondOrderLine = {
              ...BasicOrderLine.defaultOrderLine,
              id: uuid(),
              instanceId: testData.instance.instanceId,
              cost: {
                listUnitPrice: 10,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
              },
              orderFormat: 'Other',
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: testData.materialTypeId,
              },
              locations: [{ locationId: testData.location.id, quantityPhysical: 1 }],
            };
            const thirdOrderLine = {
              ...BasicOrderLine.defaultOrderLine,
              id: uuid(),
              instanceId: testData.instance.instanceId,
              cost: {
                listUnitPrice: 10,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
              },
              orderFormat: 'Other',
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: testData.materialTypeId,
              },
              locations: [{ locationId: testData.location.id, quantityPhysical: 1 }],
            };
            const fourthOrderLine = {
              ...BasicOrderLine.defaultOrderLine,
              id: uuid(),
              instanceId: testData.instance.instanceId,
              cost: {
                listUnitPrice: 10,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
              },
              orderFormat: 'Other',
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: testData.materialTypeId,
              },
              locations: [{ locationId: testData.location.id, quantityPhysical: 1 }],
            };

            Orders.createOrderWithOrderLineViaApi(orders.first, firstOrderLine).then((order) => {
              orders.first = order;

              Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });
            });
            Orders.createOrderWithOrderLineViaApi(orders.second, secondOrderLine).then((order) => {
              orders.second = order;

              Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });
            });
            Orders.createOrderWithOrderLineViaApi(orders.third, thirdOrderLine).then((order) => {
              orders.third = order;
            });
            Orders.createOrderWithOrderLineViaApi(orders.fourth, fourthOrderLine).then((order) => {
              orders.fourth = order;
            });
          });
        });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
        Receiving.waitLoading();
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
      Organizations.deleteOrganizationViaApi(organization.id);
      Locations.deleteViaApi(testData.location);
    });

    it(
      'C466170 Order line with linked Holdings could be found by "Location" filtering facet on "Receiving" pane (thunderjet) (TaaS)',
      { tags: ['smoke', 'thunderjet', 'C466170'] },
      () => {
        Receiving.resetFilters();
        Receiving.selectLocationInFilters(testData.location.name);
        Receiving.checkExistingPOLInReceivingList(`${orders.first.poNumber}-1`);
        Receiving.checkExistingPOLInReceivingList(`${orders.second.poNumber}-1`);
        Receiving.checkExistingPOLInReceivingList(`${orders.third.poNumber}-1`);
        Receiving.checkExistingPOLInReceivingList(`${orders.fourth.poNumber}-1`);
      },
    );
  });
});
