import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Helper from '../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

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
    const barcodeForFirstItem = Helper.getRandomBarcode();
    const barcodeForSecondItem = Helper.getRandomBarcode();
    const barcodeForThirdItem = Helper.getRandomBarcode();
    const barcodeForFourItem = Helper.getRandomBarcode();

    let orderNumber;
    let effectiveLocationServicePoint;
    let location;
    let user;

    before(() => {
      cy.getAdminToken();
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoints) => {
        effectiveLocationServicePoint = servicePoints;

        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
          (relocationResp) => {
            location = relocationResp;

            Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
              organization.id = organizationsResponse;
              order.vendor = organizationsResponse;
            });
            cy.createOrderApi(order).then((response) => {
              orderNumber = response.body.poNumber;

              cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
              Orders.searchByParameter('PO number', orderNumber);
              Orders.selectFromResultsList(orderNumber);
              Orders.createPOLineViaActions();
              OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
              cy.pause();
              OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
                'Purchase',
                location.name,
                '4',
              );
              OrderLines.backToEditingOrder();
              Orders.openOrder();
              OrderLines.selectPOLInOrder(0);
              OrderLines.cancelPOL();
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
            });

            TopMenuNavigation.navigateToApp('Check in');
            SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
            SwitchServicePoint.checkIsServicePointSwitched(effectiveLocationServicePoint.name);
            cy.wait(2000);
            CheckInActions.checkInItemGui(barcodeForFirstItem);
            cy.wait(6000);
            CheckInActions.checkInItemGui(barcodeForSecondItem);
            cy.wait(6000);
          },
        );
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

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Organizations.deleteOrganizationViaApi(organization.id);
    });

    // TODO: Need to find solution to delete all data, becouse now i cant delete location and user
    it(
      'C368044 Item statuses set to something other than "Order closed" or "On order" are NOT changed to "In process" upon receiving (items for receiving includes "Order closed" statuses) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C368044'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Receiving.selectLinkFromResultsList();
        Receiving.receiveFromExpectedSectionWithClosePOL();
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
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForFourItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForFourItem,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );
        InventoryItems.closeItem();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForThirdItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForThirdItem,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );
      },
    );
  });
});
