import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import InventoryInteractions from '../../../support/fragments/settings/orders/inventoryInteractions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const organization = NewOrganization.getDefaultOrganization();
    const testData = {
      organization,
      order: {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }),
        approved: true,
      },
    };

    before(() => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi()
        .then(({ instanceData }) => {
          testData.instance = instanceData;
        })
        .then(() => {
          Organizations.createOrganizationViaApi(organization).then((orgResp) => {
            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
              (locationResp) => {
                testData.location = locationResp;
                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                }).then((amResp) => {
                  cy.getBookMaterialType().then((mtypeResp) => {
                    const orderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      instanceId: testData.instance.instanceId,
                      cost: {
                        listUnitPrice: 20.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 20.0,
                      },
                      locations: [
                        { locationId: locationResp.id, quantity: 1, quantityPhysical: 1 },
                      ],
                      acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: mtypeResp.id,
                        materialSupplier: orgResp,
                        volumes: [],
                      },
                    };

                    Orders.createOrderViaApi(testData.order).then((orderResp) => {
                      testData.order.id = orderResp.id;
                      testData.orderNumber = orderResp.poNumber;
                      orderLine.purchaseOrderId = orderResp.id;

                      OrderLines.createOrderLineViaApi(orderLine);
                    });
                  });
                });
              },
            );
          });
        });
      InventoryInteractions.getInstanceMatchingSettings().then((settings) => {
        if (settings?.length !== 0) {
          InventoryInteractions.setInstanceMatchingSetting({
            ...settings[0],
            value: JSON.stringify({ isInstanceMatchingDisabled: false }),
          });
        }
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
      });
    });

    after(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C374118 Instance reference is removed when user confirms changing that will remove the instance UUID from the POL when editing PO line (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C374118'] },
      () => {
        Orders.searchByParameter('PO number', testData.orderNumber);
        Orders.selectFromResultsList(testData.orderNumber);
        OrderLines.selectPOLInOrder();
        OrderLineDetails.openOrderLineEditForm();
        OrderLines.openPageConnectedInstance();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        cy.wait(2000);
        InstanceRecordView.getAssignedHRID().then((hridBefore) => {
          testData.hridBeforeEdit = hridBefore;

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
          Orders.selectOrdersPane();
          Orders.waitLoading();
          Orders.searchByParameter('PO number', testData.orderNumber);
          Orders.selectFromResultsList(testData.orderNumber);
          OrderLines.selectPOLInOrder();
          OrderLineDetails.openOrderLineEditForm();
          OrderLines.fillInInvalidDataForPublicationDate();
          OrderLines.removeInstanceConnectionModal();
          OrderLines.saveOrderLine();
          OrderLines.backToEditingOrder();
          Orders.openOrder();
          OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
          OrderLines.selectPOLInOrder();
          OrderLines.openInstanceInPOL(testData.instance.instanceName);
          InstanceRecordView.verifyInstanceRecordViewOpened();
          cy.wait(2000);
          InstanceRecordView.getAssignedHRID().then((hridAfter) => {
            testData.hridAfterEdit = hridAfter;

            expect(testData.hridAfterEdit).not.to.equal(testData.hridBeforeEdit);
          });
        });
      },
    );
  });
});
