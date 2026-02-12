import moment from 'moment';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../support/fragments/checkout/checkout';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const testData = {
      instance: {
        title: `AT_C367971_folio instance-${getRandomPostfix()}`,
      },
      order: {
        ...NewOrder.defaultOneTimeOrder,
        approved: true,
      },
      patronGroup: {
        name: `groupCheckIn ${getRandomPostfix()}`,
      },
    };
    const itemBarcodes = [];

    before('Create test data and login', () => {
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
          ServicePoints.getCircDesk1ServicePointViaApi().then((sp1) => {
            testData.circ1LocationServicePoint = sp1;
            ServicePoints.getCircDesk2ServicePointViaApi().then((sp2) => {
              testData.circ2LocationServicePoint = sp2;

              cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
                (locationResp) => {
                  testData.location = locationResp;

                  cy.getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                  }).then((amResp) => {
                    cy.getBookMaterialType().then((mtypeResp) => {
                      Organizations.getOrganizationViaApi({
                        query: `name="${VENDOR_NAMES.GOBI}"`,
                      }).then((organizationsResponse) => {
                        testData.order.vendor = organizationsResponse.id;
                      });

                      const orderLine = {
                        ...BasicOrderLine.defaultOrderLine,
                        instanceId: testData.instance.id,
                        cost: {
                          listUnitPrice: 10.0,
                          currency: 'USD',
                          discountType: 'percentage',
                          quantityPhysical: 7,
                          poLineEstimatedPrice: 10.0,
                        },
                        locations: [
                          { locationId: locationResp.id, quantity: 7, quantityPhysical: 7 },
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

                        OrderLines.createOrderLineViaApi(orderLine);
                        Orders.updateOrderViaApi({
                          ...orderResp,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                      });
                    });
                  });
                },
              );
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
                  // "Available" for the 1st and 2nd items - Items have been checked in at the same Service point
                  CheckInActions.checkinItemViaApi({
                    itemBarcode: itemBarcodes[0],
                    servicePointId: testData.circ1LocationServicePoint.id,
                    checkInDate: new Date().toISOString(),
                  });
                  CheckInActions.checkinItemViaApi({
                    itemBarcode: itemBarcodes[1],
                    servicePointId: testData.circ1LocationServicePoint.id,
                    checkInDate: new Date().toISOString(),
                  });
                  // "In transit" for the 3rd and 4th items - Items have been checked in at another Service point
                  CheckInActions.checkinItemViaApi({
                    itemBarcode: itemBarcodes[2],
                    servicePointId: testData.circ2LocationServicePoint.id,
                    checkInDate: new Date().toISOString(),
                  });
                  CheckInActions.checkinItemViaApi({
                    itemBarcode: itemBarcodes[3],
                    servicePointId: testData.circ2LocationServicePoint.id,
                    checkInDate: new Date().toISOString(),
                  });
                  // "Claimed returned" for the 5th item - Patron checked out an item, and the patron claims to have returned the item
                  PatronGroups.createViaApi(testData.patronGroup.name).then(
                    (patronGroupResponse) => {
                      testData.patronGroup.id = patronGroupResponse;

                      cy.createTempUser(
                        [Permissions.checkinAll.gui, Permissions.loansView.gui],
                        testData.patronGroup.name,
                      )
                        .then((userProperties) => {
                          testData.userData = userProperties;
                        })
                        .then(() => {
                          UserEdit.addServicePointViaApi(
                            testData.circ1LocationServicePoint.id,
                            testData.userData.userId,
                            testData.circ1LocationServicePoint.id,
                          );
                          CheckInActions.checkinItemViaApi({
                            itemBarcode: itemBarcodes[4],
                            servicePointId: testData.circ1LocationServicePoint.id,
                            checkInDate: new Date().toISOString(),
                          });
                          Checkout.checkoutItemViaApi({
                            servicePointId: testData.circ1LocationServicePoint.id,
                            itemBarcode: itemBarcodes[4],
                            userBarcode: testData.userData.barcode,
                          }).then((body) => {
                            UserLoans.claimItemReturnedViaApi(
                              { itemClaimedReturnedDateTime: moment.utc().format() },
                              body.id,
                            );
                          });
                        });
                    },
                  );
                });
            });
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

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(testData.user.userId);
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
        testData.circ1LocationServicePoint.id,
      ]);
      Users.deleteViaApi(testData.userData.userId);
      PatronGroups.deleteViaApi(testData.patronGroup.id);
    });

    it(
      'C367971 Item statuses are set to status other than "Order closed" or "On order" and are NOT changed to "In process" upon receiving (items for receiving includes "On order" statuses) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C367971'] },
      () => {
        const itemStatusChecks = [
          { index: 0, status: ITEM_STATUS_NAMES.AVAILABLE },
          { index: 1, status: ITEM_STATUS_NAMES.AVAILABLE },
          { index: 2, status: ITEM_STATUS_NAMES.IN_TRANSIT },
          { index: 3, status: ITEM_STATUS_NAMES.IN_TRANSIT },
          { index: 4, status: ITEM_STATUS_NAMES.CLAIMED_RETURNED },
          { index: 5, status: ITEM_STATUS_NAMES.IN_PROCESS },
          { index: 6, status: ITEM_STATUS_NAMES.IN_PROCESS },
        ];

        Receiving.searchByParameter({ parameter: 'Keyword', value: testData.instance.title });
        Receiving.selectFromResultsList(testData.instance.title);
        Receiving.receiveFromExpectedSection();
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
