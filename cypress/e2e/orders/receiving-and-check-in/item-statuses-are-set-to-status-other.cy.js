import { ITEM_STATUS_NAMES, LOCATION_NAMES, VENDOR_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import ConfirmItemInModal from '../../../support/fragments/check-in-actions/confirmItemInModal';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    let user;
    let orderNumber;
    let circ2LocationServicePoint;
    let circ1LocationServicePoint;
    let location;
    const organization = {};
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      approved: true,
    };
    const instance = {
      title: `AT_C367972_folio instance-${getRandomPostfix()}`,
    };
    const barcodeForFirstItem = `1${Helper.getRandomBarcode()}`;
    const barcodeForSecondItem = `2${Helper.getRandomBarcode()}`;
    const barcodeForThirdItem = `3${Helper.getRandomBarcode()}`;
    const barcodeForFourItem = `4${Helper.getRandomBarcode()}`;
    const barcodeForFifthItem = `5${Helper.getRandomBarcode()}`;
    const barcodeForSixthItem = `6${Helper.getRandomBarcode()}`;
    const barcodeForSeventhItem = `7${Helper.getRandomBarcode()}`;

    before(() => {
      cy.getAdminToken();
      ServicePoints.getCircDesk2ServicePointViaApi().then((sp1) => {
        circ2LocationServicePoint = sp1;
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp2) => {
          circ1LocationServicePoint = sp2;

          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (locationResp) => {
              location = locationResp;

              Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
                (organizationsResponse) => {
                  organization.id = organizationsResponse.id;
                  order.vendor = organizationsResponse.id;
                },
              );

              cy.getInstanceTypes({ limit: 1 })
                .then((instanceTypeData) => {
                  instance.instanceTypeId = instanceTypeData[0].id;
                })
                .then(() => {
                  cy.createInstance({
                    instance: {
                      instanceTypeId: instance.instanceTypeId,
                      title: instance.title,
                    },
                  }).then((instanceId) => {
                    instance.id = instanceId;
                  });
                });

              cy.loginAsAdmin();
              TopMenuNavigation.openAppFromDropdown('Orders');
              Orders.selectOrdersPane();
              cy.createOrderApi(order).then((response) => {
                orderNumber = response.body.poNumber;
                Orders.searchByParameter('PO number', orderNumber);
                Orders.selectFromResultsList(orderNumber);
                Orders.createPOLineViaActions();
                OrderLines.selectRandomInstanceInTitleLookUP(instance.title, 0);
                OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
                  'Purchase',
                  locationResp.name,
                  '7',
                );
                OrderLines.backToEditingOrder();
                Orders.openOrder();
                OrderLines.selectPOLInOrder(0);
                OrderLines.openInstance();
                InventoryInstance.openHoldingsAccordion(location.name);
                cy.wait(5000);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                InventoryItems.edit();
                ItemRecordEdit.addBarcode(barcodeForFirstItem);
                ItemRecordEdit.saveAndClose();
                cy.wait(5000);
                InventoryItems.closeItemInHeader();
                InventoryInstance.openHoldingsAccordion(location.name);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                InventoryItems.edit();
                ItemRecordEdit.addBarcode(barcodeForSecondItem);
                ItemRecordEdit.saveAndClose();
                cy.wait(5000);
                InventoryItems.closeItemInHeader();
                InventoryInstance.openHoldingsAccordion(location.name);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                InventoryItems.edit();
                ItemRecordEdit.addBarcode(barcodeForThirdItem);
                ItemRecordEdit.saveAndClose();
                cy.wait(5000);
                InventoryItems.closeItemInHeader();
                InventoryInstance.openHoldingsAccordion(location.name);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                InventoryItems.edit();
                ItemRecordEdit.addBarcode(barcodeForFourItem);
                ItemRecordEdit.saveAndClose();
                cy.wait(5000);
                InventoryItems.closeItemInHeader();
                InventoryInstance.openHoldingsAccordion(location.name);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                InventoryItems.edit();
                ItemRecordEdit.addBarcode(barcodeForFifthItem);
                ItemRecordEdit.saveAndClose();
                cy.wait(5000);
                InventoryItems.closeItemInHeader();
                InventoryInstance.openHoldingsAccordion(location.name);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                InventoryItems.edit();
                ItemRecordEdit.addBarcode(barcodeForSixthItem);
                ItemRecordEdit.saveAndClose();
                cy.wait(5000);
                InventoryItems.closeItemInHeader();
                InventoryInstance.openHoldingsAccordion(location.name);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                InventoryItems.edit();
                ItemRecordEdit.addBarcode(barcodeForSeventhItem);
                ItemRecordEdit.saveAndClose();
                cy.wait(5000);
                InventoryItems.closeItemInHeader();
              });

              TopMenuNavigation.navigateToApp('Check in');
              CheckInActions.waitLoading();
              CheckInActions.checkInItemGui(barcodeForFirstItem);
              cy.wait(3000);
              CheckInActions.checkInItemGui(barcodeForSecondItem);
              SwitchServicePoint.switchServicePoint(circ2LocationServicePoint.name);
              SwitchServicePoint.checkIsServicePointSwitched(circ2LocationServicePoint.name);
              CheckInActions.waitLoading();
              CheckInActions.checkInItemGui(barcodeForThirdItem);
              cy.wait(2000);
              ConfirmItemInModal.confirmInTransitModal();
              cy.wait(3000);
              CheckInActions.checkInItemGui(barcodeForFourItem);
              cy.wait(3000);
              ConfirmItemInModal.confirmInTransitModal();
              SwitchServicePoint.switchServicePoint(circ1LocationServicePoint.name);
              SwitchServicePoint.checkIsServicePointSwitched(circ1LocationServicePoint.name);
            },
          );
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.receivingPath,
          waiter: Receiving.waitLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C367971 Item statuses are set to status other than "Order closed" or "On order" and are NOT changed to "In process" upon receiving (items for receiving includes "On order" statuses) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C367971'] },
      () => {
        Receiving.searchByParameter({ parameter: 'Keyword', value: instance.title });
        Receiving.selectFromResultsList(instance.title);
        Receiving.receiveFromExpectedSection();
        Receiving.receiveAll();
        Receiving.clickOnInstance();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForFirstItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForFirstItem,
          ITEM_STATUS_NAMES.AVAILABLE,
        );
        InventoryItems.closeItem();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForSecondItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForSecondItem,
          ITEM_STATUS_NAMES.AVAILABLE,
        );
        InventoryItems.closeItem();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForThirdItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForThirdItem,
          `${ITEM_STATUS_NAMES.IN_TRANSIT} to Circ Desk 1`,
        );
        InventoryItems.closeItem();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForFourItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForFourItem,
          `${ITEM_STATUS_NAMES.IN_TRANSIT} to Circ Desk 1`,
        );
        InventoryItems.closeItem();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForSixthItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForSixthItem,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );
        InventoryItems.closeItem();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForSeventhItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForSeventhItem,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );
      },
    );
  });
});
