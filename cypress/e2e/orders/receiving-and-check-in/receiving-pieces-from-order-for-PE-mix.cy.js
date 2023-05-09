import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import testType from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import ItemRecordView from '../../support/fragments/inventory/itemRecordView';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import ItemActions from '../../support/fragments/inventory/inventoryItem/itemActions';
import ItemRecordEdit from '../../support/fragments/inventory/itemRecordEdit';
import SwitchServicePoint from '../../support/fragments/servicePoint/switchServicePoint';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import { ITEM_STATUS_NAMES } from '../../support/constants';
// import Users from '../../support/fragments/users/users';

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
      }
    ]
  };
  const barcodeForFirstItem = Helper.getRandomBarcode();
  const barcodeForSecondItem = Helper.getRandomBarcode();
  const barcodeForThirdItem = Helper.getRandomBarcode();
  const barcodeForFourItem = Helper.getRandomBarcode();

  let orderNumber;
  let user;
  let effectiveLocationServicePoint;
  let location;

  before(() => {
    cy.getAdminToken();

    ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' })
      .then((servicePoints) => {
        effectiveLocationServicePoint = servicePoints[0];
        NewLocation.createViaApi(NewLocation.getDefaultLocation(effectiveLocationServicePoint.id))
          .then((locationResponse) => {
            location = locationResponse;
            Organizations.createOrganizationViaApi(organization)
              .then(organizationsResponse => {
                organization.id = organizationsResponse;
                order.vendor = organizationsResponse;
              });

            cy.loginAsAdmin({ path:TopMenu.ordersPath, waiter: Orders.waitLoading });
            cy.createOrderApi(order)
              .then((response) => {
                orderNumber = response.body.poNumber;
                Orders.searchByParameter('PO number', orderNumber);
                Orders.selectFromResultsList();
                Orders.createPOLineViaActions();
                OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
                OrderLines.fillInPOLineInfoForExportWithLocationForPhisicalResource(`${organization.accounts[0].name} (${organization.accounts[0].accountNo})`, 'Purchase', locationResponse.institutionId, '4');
                OrderLines.backToEditingOrder();
                Orders.openOrder();
                OrderLines.selectPOLInOrder(0);
                OrderLines.cancelPOL();
                OrderLines.openInstance();
                InventoryInstance.openHoldingsAccordion(location.name);
                // Need to wait,while instance will be loaded
                cy.wait(3000);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode', 'row-0', 10);
                ItemActions.edit();
                ItemRecordEdit.addBarcode(barcodeForFirstItem);
                ItemRecordEdit.save();
                // Need to wait,while instance will be saved
                cy.wait(3000);
                ItemActions.closeItem();
                InventoryInstance.openHoldingsAccordion(location.name);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode', 'row-1', 10);
                ItemActions.edit();
                ItemRecordEdit.addBarcode(barcodeForSecondItem);
                ItemRecordEdit.save();
                // Need to wait,while instance will be saved
                cy.wait(3000);
                ItemActions.closeItem();
                InventoryInstance.openHoldingsAccordion(location.name);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode', 'row-2', 10);
                ItemActions.edit();
                ItemRecordEdit.addBarcode(barcodeForThirdItem);
                ItemRecordEdit.save();
                // Need to wait,while instance will be saved
                cy.wait(3000);
                ItemActions.closeItem();
                InventoryInstance.openHoldingsAccordion(location.name);
                InventoryInstance.openItemByBarcodeAndIndex('No barcode', 'row-3', 10);
                ItemActions.edit();
                ItemRecordEdit.addBarcode(barcodeForFourItem);
                ItemRecordEdit.save();
                // Need to wait,while instance will be saved
                cy.wait(3000);
                ItemActions.closeItem();
              });

            cy.visit(TopMenu.checkInPath);
            SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
            SwitchServicePoint.checkIsServicePointSwitched(effectiveLocationServicePoint.name);
            // Need to wait,while Checkin page will be loaded in same location
            cy.wait(2000);
            CheckInActions.checkInItemGui(barcodeForFirstItem);
            cy.wait(2000);
            CheckInActions.checkInItemGui(barcodeForSecondItem);
          });
      });

    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.uiReceivingViewEditCreate.gui,

    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.receivingPath, waiter: Receiving.waitLoading });
      });
  });

  after(() => {
    Checkout.checkoutItemViaApi({
      id: uuid(),
      itemBarcode: barcodeForFirstItem,
      loanDate: moment.utc().format(),
      servicePointId: effectiveLocationServicePoint.id,
      userBarcode: user.barcode,
    });
    Checkout.checkoutItemViaApi({
      id: uuid(),
      itemBarcode: barcodeForSecondItem,
      loanDate: moment.utc().format(),
      servicePointId: effectiveLocationServicePoint.id,
      userBarcode: user.barcode,
    });
    cy.loginAsAdmin({ path:TopMenu.receivingPath, waiter: Receiving.waitLoading });
    Orders.searchByParameter('PO number', orderNumber);
    Receiving.selectFromResultsList();
    Receiving.unreceiveFromReceivedSection();
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList();
    Orders.reOpenOrder();
    Orders.unOpenOrder(orderNumber);
    OrderLines.selectPOLInOrder(0);
    OrderLines.deleteOrderLine();
    // Need to wait until the order is opened before deleting it
    cy.wait(2000);
    Orders.deleteOrderViaApi(order.id);

    Organizations.deleteOrganizationViaApi(organization.id);
    // TODO: Need to find solution to delete all data, becouse now i cant delete location and user
    // NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
    //     location.institutionId,
    //     location.campusId,
    //     location.libraryId,
    //     location.id
    //   );

    // Users.deleteViaApi(user.userId);
  });

  it('C738 Receiving pieces from an order for P/E MIx that is set to create Items in inventory (items for receiving includes "Order closed" statuses) (thunderjet)', { tags: [testType.smoke, devTeams.thunderjet] }, () => {
    Orders.searchByParameter('PO number', orderNumber);
    Receiving.selectFromResultsList();
    Receiving.receiveFromExpectedSectionWithClosePOL();
    Receiving.receiveAll();
    Receiving.clickOnInstance();
    InventoryInstance.openHoldingsAccordion(location.name);
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', barcodeForFirstItem);
    ItemRecordView.checkItemDetails(location.name, barcodeForFirstItem, ITEM_STATUS_NAMES.AVAILABLE);
    ItemActions.closeItem();
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', barcodeForSecondItem);
    ItemRecordView.checkItemDetails(location.name, barcodeForSecondItem, ITEM_STATUS_NAMES.AVAILABLE);
    ItemActions.closeItem();
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', barcodeForThirdItem);
    ItemRecordView.checkItemDetails(location.name, barcodeForThirdItem, 'In process');
    ItemActions.closeItem();
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', barcodeForFourItem);
    ItemRecordView.checkItemDetails(location.name, barcodeForFourItem, 'In process');
  });
});
