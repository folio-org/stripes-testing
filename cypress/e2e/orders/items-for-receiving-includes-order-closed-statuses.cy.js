import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import testType from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import ItemActions from '../../support/fragments/inventory/inventoryItem/itemActions';
import ItemRecordEdit from '../../support/fragments/inventory/item/itemRecordEdit';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import { ITEM_STATUS_NAMES } from '../../support/constants';

describe('orders: Receiving and Check-in', () => {
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

  before(() => {
    cy.getAdminToken();

    ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' }).then((servicePoints) => {
      effectiveLocationServicePoint = servicePoints[0];
      NewLocation.createViaApi(
        NewLocation.getDefaultLocation(effectiveLocationServicePoint.id),
      ).then((locationResponse) => {
        location = locationResponse;
        Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
          organization.id = organizationsResponse;
          order.vendor = organizationsResponse;
        });

        cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
        cy.createOrderApi(order).then((response) => {
          orderNumber = response.body.poNumber;
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList();
          Orders.createPOLineViaActions();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
          OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
            'Purchase',
            locationResponse.institutionId,
            '4',
          );
          OrderLines.backToEditingOrder();
          Orders.openOrder();
          OrderLines.selectPOLInOrder(0);
          OrderLines.cancelPOL();
          OrderLines.openInstance();
          InventoryInstance.openHoldingsAccordion(location.name);
          // Need to wait,while instance will be loaded
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(5000);
          InventoryInstance.openItemByBarcodeAndIndex('No barcode');
          ItemActions.edit();
          ItemRecordEdit.addBarcode(barcodeForFirstItem);
          ItemRecordEdit.save();
          // Need to wait,while instance will be saved
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(5000);
          ItemActions.closeItem();
          InventoryInstance.openHoldingsAccordion(location.name);
          InventoryInstance.openItemByBarcodeAndIndex('No barcode');
          ItemActions.edit();
          ItemRecordEdit.addBarcode(barcodeForSecondItem);
          ItemRecordEdit.save();
          // Need to wait,while instance will be saved
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(5000);
          ItemActions.closeItem();
          InventoryInstance.openHoldingsAccordion(location.name);
          InventoryInstance.openItemByBarcodeAndIndex('No barcode');
          ItemActions.edit();
          ItemRecordEdit.addBarcode(barcodeForThirdItem);
          ItemRecordEdit.save();
          // Need to wait,while instance will be saved
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(5000);
          ItemActions.closeItem();
          InventoryInstance.openHoldingsAccordion(location.name);
          InventoryInstance.openItemByBarcodeAndIndex('No barcode');
          ItemActions.edit();
          ItemRecordEdit.addBarcode(barcodeForFourItem);
          ItemRecordEdit.save();
          // Need to wait,while instance will be saved
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(5000);
          ItemActions.closeItem();
        });

        cy.visit(TopMenu.checkInPath);
        SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
        SwitchServicePoint.checkIsServicePointSwitched(effectiveLocationServicePoint.name);
        // Need to wait,while Checkin page will be loaded in same location
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(2000);
        CheckInActions.checkInItemGui(barcodeForFirstItem);
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(2000);
        CheckInActions.checkInItemGui(barcodeForSecondItem);
      });
    });

    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.waitLoading,
      });
    });
  });

  // TODO: Need to find solution to delete all data, becouse now i cant delete location and user

  it(
    'C368044 Item statuses set to something other than "Order closed" or "On order" are NOT changed to "In process" upon receiving (items for receiving includes "Order closed" statuses) (thunderjet)',
    { tags: [testType.smoke, devTeams.thunderjet] },
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
      ItemActions.closeItem();
      InventoryInstance.openHoldingsAccordion(location.name);
      InventoryInstance.openItemByBarcodeAndIndex(barcodeForSecondItem);
      ItemRecordView.checkItemDetails(
        location.name,
        barcodeForSecondItem,
        ITEM_STATUS_NAMES.AVAILABLE,
      );
      ItemActions.closeItem();
      InventoryInstance.openHoldingsAccordion(location.name);
      InventoryInstance.openItemByBarcodeAndIndex(barcodeForFourItem);
      ItemRecordView.checkItemDetails(
        location.name,
        barcodeForFourItem,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );
      ItemActions.closeItem();
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
