import { ITEM_STATUS_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import ConfirmItemInModal from '../../../support/fragments/check-in-actions/confirmItemInModal';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      approved: true,
    };
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      accounts: [
        {
          accountNo: getRandomPostfix(),
          accountStatus: 'Active',
          acqUnitIds: [],
          appSystemNo: '',
          description: 'Main library account',
          libraryCode: 'COB',
          libraryEdiCode: getRandomPostfix(),
          name: 'TestAccout1',
          notes: '',
          paymentMethod: 'Cash',
        },
      ],
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

    let user;
    let orderNumber;
    let circ2LocationServicePoint;
    let circ1LocationServicePoint;
    let location;

    before(() => {
      cy.getAdminToken();

      ServicePoints.getCircDesk2ServicePointViaApi().then((sp1) => {
        circ2LocationServicePoint = sp1;
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp2) => {
          circ1LocationServicePoint = sp2;
          NewLocation.createViaApi(
            NewLocation.getDefaultLocation(circ2LocationServicePoint.id),
          ).then((locationResponse) => {
            location = locationResponse;
            Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
              organization.id = organizationsResponse;
              order.vendor = organizationsResponse;
            });

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
                locationResponse.name,
                '7',
              );
              OrderLines.backToEditingOrder();
              Orders.openOrder();
              OrderLines.selectPOLInOrder(0);
              OrderLines.openInstance();
              InventoryInstance.openHoldingsAccordion(location.name);
              // Need to wait,while instance will be loaded
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(5000);
              InventoryInstance.openItemByBarcodeAndIndex('No barcode');
              InventoryItems.edit();
              ItemRecordEdit.addBarcode(barcodeForFirstItem);
              ItemRecordEdit.saveAndClose();
              // Need to wait,while instance will be saved
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(5000);
              InventoryItems.closeItemInHeader();
              InventoryInstance.openHoldingsAccordion(location.name);
              InventoryInstance.openItemByBarcodeAndIndex('No barcode');
              InventoryItems.edit();
              ItemRecordEdit.addBarcode(barcodeForSecondItem);
              ItemRecordEdit.saveAndClose();
              // Need to wait,while instance will be saved
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(5000);
              InventoryItems.closeItemInHeader();
              InventoryInstance.openHoldingsAccordion(location.name);
              InventoryInstance.openItemByBarcodeAndIndex('No barcode');
              InventoryItems.edit();
              ItemRecordEdit.addBarcode(barcodeForThirdItem);
              ItemRecordEdit.saveAndClose();
              // Need to wait,while instance will be saved
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(5000);
              InventoryItems.closeItemInHeader();
              InventoryInstance.openHoldingsAccordion(location.name);
              InventoryInstance.openItemByBarcodeAndIndex('No barcode');
              InventoryItems.edit();
              ItemRecordEdit.addBarcode(barcodeForFourItem);
              ItemRecordEdit.saveAndClose();
              // Need to wait,while instance will be saved
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(5000);
              InventoryItems.closeItemInHeader();
              InventoryInstance.openHoldingsAccordion(location.name);
              InventoryInstance.openItemByBarcodeAndIndex('No barcode');
              InventoryItems.edit();
              ItemRecordEdit.addBarcode(barcodeForFifthItem);
              ItemRecordEdit.saveAndClose();
              // Need to wait,while instance will be saved
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(5000);
              InventoryItems.closeItemInHeader();
              InventoryInstance.openHoldingsAccordion(location.name);
              InventoryInstance.openItemByBarcodeAndIndex('No barcode');
              InventoryItems.edit();
              ItemRecordEdit.addBarcode(barcodeForSixthItem);
              ItemRecordEdit.saveAndClose();
              // Need to wait,while instance will be saved
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(5000);
              InventoryItems.closeItemInHeader();
              InventoryInstance.openHoldingsAccordion(location.name);
              InventoryInstance.openItemByBarcodeAndIndex('No barcode');
              InventoryItems.edit();
              ItemRecordEdit.addBarcode(barcodeForSeventhItem);
              ItemRecordEdit.saveAndClose();
              // Need to wait,while instance will be saved
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(5000);
              InventoryItems.closeItemInHeader();
            });

            SwitchServicePoint.switchServicePoint(circ2LocationServicePoint.name);
            SwitchServicePoint.checkIsServicePointSwitched(circ2LocationServicePoint.name);
            TopMenuNavigation.navigateToApp('Check in');
            // Need to wait,while Checkin page will be loaded in same location
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            cy.wait(2000);
            CheckInActions.checkInItemGui(barcodeForFirstItem);
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            cy.wait(6000);
            CheckInActions.checkInItemGui(barcodeForSecondItem);
            cy.wait(6000);
            SwitchServicePoint.switchServicePoint(circ1LocationServicePoint.name);
            SwitchServicePoint.checkIsServicePointSwitched(circ1LocationServicePoint.name);
            TopMenuNavigation.navigateToApp('Check in');
            // Need to wait,while Checkin page will be loaded in same location
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            cy.wait(2000);
            CheckInActions.checkInItemGui(barcodeForThirdItem);
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            ConfirmItemInModal.confirmInTransitModal();
            cy.wait(6000);
            CheckInActions.checkInItemGui(barcodeForFourItem);
            ConfirmItemInModal.confirmInTransitModal();
            cy.wait(6000);
          });
        });
      });

      cy.createTempUser([
        permissions.uiInventoryViewInstances.gui,
        permissions.uiReceivingViewEditCreate.gui,
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

    //     // TODO: Need to find solution to delete all data, because now i cant delete location and user
    //     // TODO: also need to delete service points

    it(
      'C367971 Item statuses are set to status other than "Order closed" or "On order" and are NOT changed to "In process" upon receiving (items for receiving includes "On order" statuses) (thunderjet)',
      { tags: ['criticalPathBroken', 'thunderjet', 'C367971'] },
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
          `${ITEM_STATUS_NAMES.IN_TRANSIT} to Online`,
        );
        InventoryItems.closeItem();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForFourItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForFourItem,
          `${ITEM_STATUS_NAMES.IN_TRANSIT} to Online`,
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
