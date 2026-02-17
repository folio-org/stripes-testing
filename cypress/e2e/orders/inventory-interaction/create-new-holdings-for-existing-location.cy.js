import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      servicePoint: ServicePoints.defaultServicePoint,
      instance: {},
      location: {},
      order: {},
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            testData.instance = instanceData;

            Organizations.createOrganizationViaApi(testData.organization);
          });
        })
        .then(() => {
          ServicePoints.createViaApi(testData.servicePoint).then(() => {
            testData.location = Locations.getDefaultLocation({
              servicePointId: testData.servicePoint.id,
            }).location;

            Locations.createViaApi(testData.location).then(() => {
              Orders.createOrderViaApi(
                NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
              ).then((order) => {
                testData.order = order;

                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: testData.instance.instanceId,
                    permanentLocationId: testData.location.id,
                    sourceId: folioSource.id,
                  }).then(({ id: holdingId }) => {
                    testData.instance.holdingId = holdingId;
                  });
                });
              });
            });
          });
        });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryHoldings.deleteHoldingRecordViaApi(testData.instance.holdingId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      Locations.deleteViaApi(testData.location);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C375232 Create new holdings for already existing location when creating an order line (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C375232'] },
      () => {
        // Click on "PO number" link on "Orders" pane
        Orders.selectOrderByPONumber(testData.order.poNumber);

        // Select "Add PO line" option & fill the fields
        OrderLines.addPolToOrder(
          {
            title: testData.instance.instanceTitle,
            method: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM,
            format: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
            price: '20',
            quantity: '1',
            inventory: 'Instance, holdings, item',
            materialType: MATERIAL_TYPE_NAMES.BOOK,
          },
          false,
        );

        // Click "Create new holdings for location" link in "Location" accordion
        const SelectLocationModal = OrderLines.openCreateHoldingForLocation();
        SelectLocationModal.verifyModalView();

        // Select permanent location from Preconditions item #1
        SelectLocationModal.selectLocation(testData.location.name);

        // Fill the following fields & click "Save"
        OrderLines.setPhysicalQuantity('1');
        OrderLines.savePol();
        OrderLines.checkTitle(testData.instance.instanceTitle);

        // Click back arrow on- the top left of the third "PO Line details
        OrderLines.backToEditingOrder();
        OrderLines.selectPOLInOrder(0);
      },
    );
  });
});
