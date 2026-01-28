import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Helper from '../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const testData = {
      order: {
        ...NewOrder.defaultOneTimeOrder,
        approved: true,
      },
      instance: {
        title: `AT_368044_folio instance-${getRandomPostfix()}`,
      },
    };
    const itemBarcodes = [];

    before(() => {
      cy.getAdminToken();
      cy.getInstanceTypes({ limit: 1 })
        .then((instanceTypeData) => {
          testData.instance.instanceTypeId = instanceTypeData[0].id;

          cy.createInstance({
            instance: {
              instanceTypeId: testData.instance.instanceTypeId,
              title: testData.instance.title,
            },
          }).then((instanceId) => {
            testData.instance.id = instanceId;
          });
        })
        .then(() => {
          ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoints) => {
            testData.effectiveLocationServicePoint = servicePoints;

            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
              (locationResp) => {
                testData.location = locationResp;
                Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
                  (organizationsResponse) => {
                    testData.order.vendor = organizationsResponse.id;

                    cy.getAcquisitionMethodsApi({
                      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                    }).then((amResp) => {
                      cy.getBookMaterialType().then((mtypeResp) => {
                        const orderLine = {
                          ...BasicOrderLine.defaultOrderLine,
                          instanceId: testData.instance.id,
                          cost: {
                            listUnitPrice: 10.0,
                            currency: 'USD',
                            discountType: 'percentage',
                            quantityPhysical: 4,
                            poLineEstimatedPrice: 10.0,
                          },
                          locations: [
                            { locationId: locationResp.id, quantity: 4, quantityPhysical: 4 },
                          ],
                          acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                          physical: {
                            createInventory: 'Instance, Holding, Item',
                            materialType: mtypeResp.id,
                            volumes: [],
                          },
                          titleOrPackage: testData.instance.title,
                        };

                        Orders.createOrderViaApi(testData.order).then((orderResp) => {
                          testData.order.id = orderResp.id;
                          testData.orderNumber = orderResp.poNumber;
                          orderLine.purchaseOrderId = orderResp.id;

                          OrderLines.createOrderLineViaApi(orderLine).then((polResponse) => {
                            Orders.updateOrderViaApi({
                              ...orderResp,
                              workflowStatus: ORDER_STATUSES.OPEN,
                            });
                            OrderLines.getOrderLineByIdViaApi(polResponse.id).then(
                              (orderLineResp) => {
                                OrderLines.updateOrderLineViaApi({
                                  ...orderLineResp,
                                  paymentStatus: 'Cancelled',
                                  receiptStatus: 'Cancelled',
                                });
                              },
                            );
                          });
                          // get items and update barcodes
                          cy.getInstance({
                            limit: 1,
                            expandAll: true,
                            query: `"id"=="${testData.instance.id}"`,
                          })
                            .then((instanceData) => {
                              instanceData.items.forEach((item) => {
                                cy.getItems({ limit: 1, query: `"hrid"=="${item.hrid}"` }).then(
                                  (originalItemData) => {
                                    const itemBarcode = Helper.getRandomBarcode();
                                    const itemData = originalItemData;
                                    itemData.barcode = itemBarcode;

                                    cy.updateItemViaApi(itemData);
                                    itemBarcodes.push(itemBarcode);
                                  },
                                );
                              });
                            })
                            .then(() => {
                              CheckInActions.checkinItemViaApi({
                                itemBarcode: itemBarcodes[0],
                                servicePointId: testData.effectiveLocationServicePoint.id,
                                checkInDate: new Date().toISOString(),
                              });
                              CheckInActions.checkinItemViaApi({
                                itemBarcode: itemBarcodes[1],
                                servicePointId: testData.effectiveLocationServicePoint.id,
                                checkInDate: new Date().toISOString(),
                              });
                            });
                        });
                      });
                    });
                  },
                );
              },
            );
          });
        });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
        Receiving.waitLoading();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C368044 Item statuses set to something other than "Order closed" or "On order" are NOT changed to "In process" upon receiving (items for receiving includes "Order closed" statuses) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C368044'] },
      () => {
        const itemStatusChecks = [
          { index: 0, status: ITEM_STATUS_NAMES.AVAILABLE },
          { index: 1, status: ITEM_STATUS_NAMES.AVAILABLE },
          { index: 2, status: ITEM_STATUS_NAMES.IN_PROCESS },
          { index: 3, status: ITEM_STATUS_NAMES.IN_PROCESS },
        ];

        Orders.searchByParameter('PO number', testData.orderNumber);
        Receiving.selectLinkFromResultsList();
        Receiving.receiveFromExpectedSectionWithClosePOL();
        Receiving.receiveAll();
        Receiving.clickOnInstance();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        itemStatusChecks.forEach(({ index, status }) => {
          InventoryInstance.checkItemStatusByBarcode(itemBarcodes[index], status);
        });
      },
    );
  });
});
