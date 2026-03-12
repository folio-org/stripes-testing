import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const testData = {
      barcode: uuid(),
      organization: NewOrganization.getDefaultOrganization(),
      instance: {},
      materialType: {},
      location: {},
      order: {},
      orderLine: {},
      user: {},
    };

    beforeEach('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;

        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
          (locationResp) => {
            testData.location = locationResp;

            InventoryHoldings.getHoldingsFolioSource().then((folioSourceResp) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: instanceData.instanceId,
                permanentLocationId: locationResp.id,
                sourceId: folioSourceResp.id,
              });
              cy.getDefaultMaterialType().then((materialTypeResp) => {
                testData.materialType = materialTypeResp;

                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                }).then((params) => {
                  Organizations.createOrganizationViaApi(testData.organization).then(() => {
                    testData.order = NewOrder.getDefaultOrder({
                      vendorId: testData.organization.id,
                    });
                    testData.orderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      instanceId: testData.instance.instanceId,
                      titleOrPackage: testData.instance.instanceTitle,
                      cost: {
                        listUnitPrice: 5.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 5.0,
                      },
                      locations: [
                        { locationId: testData.location.id, quantity: 1, quantityPhysical: 1 },
                      ],
                      acquisitionMethod: params.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: testData.materialType.id,
                        materialSupplier: testData.organization.id,
                        volumes: [],
                      },
                    };

                    Orders.createOrderViaApi(testData.order).then((orderResponse) => {
                      testData.order = orderResponse;
                      testData.orderLine.purchaseOrderId = orderResponse.id;

                      OrderLines.createOrderLineViaApi(testData.orderLine);
                      Orders.updateOrderViaApi({
                        ...orderResponse,
                        workflowStatus: ORDER_STATUSES.OPEN,
                      });
                    });
                  });
                });
              });
            });
          },
        );
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C375241 Create new holdings for already existing location when receiving item by "Receive" option (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C375241'] },
      () => {
        // Click on the Order
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Click "Actions", Select "Receive" option
        const Receivings = OrderDetails.openReceivingsPage();

        // Click on the hyperlink with title name in "Title" column
        const ReceivingDetails = Receivings.selectFromResultsList(
          testData.orderLine.titleOrPackage,
        );
        ReceivingDetails.checkReceivingDetails({
          orderLineDetails: [{ key: 'POL number', value: `${testData.order.poNumber}-1` }],
          expected: [{ format: 'Physical' }],
          received: [],
        });

        // Click "Actions" button, Select "Receive" option
        const ReceivingsListEditForm = ReceivingDetails.openReceiveListEditForm();
        ReceivingsListEditForm.checkButtonsConditions([
          { label: 'Cancel', conditions: { disabled: false } },
          { label: 'Receive', conditions: { disabled: true } },
        ]);

        // Click "Create new holdings for location" link in "Select location" column
        const SelectLocationModal = ReceivingsListEditForm.clickCreateNewHoldingsButton();

        // Select permanent location from Precondition, Click "Save and close" button
        SelectLocationModal.selectLocation(testData.location.name);

        ReceivingsListEditForm.checkReceivingItemDetails({
          receivedLocation: testData.location.name,
        });

        // Fill "Barcode" field with valid value, Check the checkbox next to receiving record
        ReceivingsListEditForm.fillReceivingFields({ barcode: testData.barcode });
        // Click "Receive" button
        ReceivingsListEditForm.clickReceiveButton();
        ReceivingDetails.checkReceivingDetails({
          expected: [],
          received: [{ barcode: testData.barcode, format: 'Physical' }],
        });

        // Click "<Title name>" link on the third pane
        const InventoryInstanceDetails = ReceivingDetails.openInstanceDetails();
        InventoryInstanceDetails.checkHoldingTitle({ title: testData.location.name, count: 0 });
        InventoryInstanceDetails.checkHoldingTitle({ title: testData.location.name, count: 1 });
      },
    );
  });
});
