import uuid from 'uuid';
import { including } from '@interactors/html';

import { Permissions } from '../../../support/dictionary';
import { NewOrder, BasicOrderLine, Orders, OrderLines } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  ORDER_STATUSES,
  LOCATION_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Receiving from '../../../support/fragments/receiving/receiving';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

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

    before('Create test data', () => {
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
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Orders.deleteOrderViaApi(testData.order.id);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C375242 Create new holdings for already existing location when receiving item by "Quick receive" option (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C375242'] },
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

        // Click on the record in "Expected" accordion on "<Title name>" pane
        const EditPieceModal = ReceivingDetails.openEditPieceModal();
        EditPieceModal.checkFieldsConditions([
          {
            label: 'Piece format',
            conditions: { required: true, value: 'Physical' },
          },
        ]);

        // Click "Create new holdings for location" link
        const SelectLocationModal = EditPieceModal.clickCreateNewholdingsForLocation();

        // Select permanent location from Precondition, Click "Save and close" button
        SelectLocationModal.selectLocation(testData.location.name);

        // Click "Save and close" button
        EditPieceModal.checkFieldsConditions([
          {
            label: 'Order line locations',
            conditions: { value: including(testData.location.name) },
          },
        ]);

        // Click "Quick receive" button
        Receiving.openDropDownInEditPieceModal();
        EditPieceModal.clickQuickReceiveButton();
        ReceivingDetails.checkReceivingDetails({
          expected: [],
          received: [{ format: 'Physical' }],
        });

        // Click "<Title name>" link on the third pane
        const InventoryInstanceDetails = ReceivingDetails.openInstanceDetails();
        InventoryInstanceDetails.checkHoldingTitle({ title: testData.location.name, count: 0 });
        InventoryInstanceDetails.checkHoldingTitle({ title: testData.location.name, count: 1 });
      },
    );
  });
});
