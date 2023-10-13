import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import testType from '../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import Receiving from '../../../support/fragments/receiving/receiving';
import TopMenu from '../../../support/fragments/topMenu';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import OrderLines from '../../../support/fragments/orders/orderLines';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemActions from '../../../support/fragments/inventory/inventoryItem/itemActions';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import Users from '../../../support/fragments/users/users';

describe('Orders: Receiving and Check-in', () => {
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
  const changedBarcode = Helper.getRandomBarcode();

  let orderNumber;
  let user;
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
          Orders.selectFromResultsList(orderNumber);
          Orders.createPOLineViaActions();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
          OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
            'Purchase',
            locationResponse.institutionId,
            '2',
          );
          OrderLines.backToEditingOrder();
        });
      });
    });

    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersView.gui,
      permissions.uiReceivingViewEditCreate.gui,
      permissions.uiInventoryViewCreateEditItems.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.receivingPath, waiter: Receiving.waitLoading });
    Orders.searchByParameter('PO number', orderNumber);
    Receiving.selectLinkFromResultsList();
    Receiving.unreceiveFromReceivedSection();
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList();
    Orders.unOpenOrder();
    OrderLines.selectPOLInOrder(0);
    OrderLines.deleteOrderLine();
    // Need to wait until the order is opened before deleting it
    cy.wait(2000);
    Orders.deleteOrderViaApi(order.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C736 Update Barcode and call number information when receiving (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.openOrder();
      Orders.receiveOrderViaActions();
      Receiving.selectLinkFromResultsList();
      Receiving.receiveFromExpectedSection();
      Receiving.receiveAllPhysicalItemsWithBarcodes(barcodeForFirstItem, barcodeForSecondItem);
      Receiving.clickOnInstance();
      InventoryInstance.openHoldingsAccordion(location.name);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', barcodeForFirstItem);
      ItemRecordView.checkItemDetails(
        location.name,
        barcodeForFirstItem,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );
      ItemActions.edit();
      ItemRecordView.changeItemBarcode(changedBarcode);
      ItemRecordView.checkItemDetails(location.name, changedBarcode, ITEM_STATUS_NAMES.IN_PROCESS);
      ItemActions.closeItem();
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', barcodeForSecondItem);
      ItemRecordView.checkItemDetails(
        location.name,
        barcodeForSecondItem,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );
      ItemActions.closeItem();
      InventorySearchAndFilter.switchToItem();
    },
  );
});
