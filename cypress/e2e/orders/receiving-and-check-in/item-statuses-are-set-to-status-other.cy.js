// import moment from 'moment';
// import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import testType from '../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import Receiving from '../../../support/fragments/receiving/receiving';
import TopMenu from '../../../support/fragments/topMenu';
import Helper from '../../../support/fragments/finance/financeHelper';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import OrderLines from '../../../support/fragments/orders/orderLines';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemActions from '../../../support/fragments/inventory/inventoryItem/itemActions';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import SwitchServicePoint from '../../../support/fragments/servicePoint/switchServicePoint';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
// import Checkout from '../../../support/fragments/checkout/checkout';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
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
  const barcodeForFirstItem = `1${Helper.getRandomBarcode()}`;
  const barcodeForSecondItem = `2${Helper.getRandomBarcode()}`;
  const barcodeForThirdItem = `3${Helper.getRandomBarcode()}`;
  const barcodeForFourItem = `4${Helper.getRandomBarcode()}`;
  const barcodeForFifthItem = `5${Helper.getRandomBarcode()}`;
  const barcodeForSixthItem = `6${Helper.getRandomBarcode()}`;
  const barcodeForSeventhItem = `7${Helper.getRandomBarcode()}`;

  let orderNumber;
  let user;
  let circ2LocationServicePoint;
  let circ1LocationServicePoint;
  let location;

  before(() => {
    cy.getAdminToken();

    ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' })
      .then((servicePoints) => {
        circ2LocationServicePoint = servicePoints[0];
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' })
          .then((servicePointsResponse) => {
            circ1LocationServicePoint = servicePointsResponse[0];
            NewLocation.createViaApi(NewLocation.getDefaultLocation(circ2LocationServicePoint.id))
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
                    OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
                    OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(`${organization.accounts[0].name} (${organization.accounts[0].accountNo})`, 'Purchase', locationResponse.institutionId, '7');
                    OrderLines.backToEditingOrder();
                    Orders.openOrder();
                    OrderLines.selectPOLInOrder(0);
                    OrderLines.openInstance();
                    InventoryInstance.openHoldingsAccordion(location.name);
                    // Need to wait,while instance will be loaded
                    cy.wait(5000);
                    InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                    ItemActions.edit();
                    ItemRecordEdit.addBarcode(barcodeForFirstItem);
                    ItemRecordEdit.save();
                    // Need to wait,while instance will be saved
                    cy.wait(5000);
                    ItemActions.closeItem();
                    InventoryInstance.openHoldingsAccordion(location.name);
                    InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                    ItemActions.edit();
                    ItemRecordEdit.addBarcode(barcodeForSecondItem);
                    ItemRecordEdit.save();
                    // Need to wait,while instance will be saved
                    cy.wait(5000);
                    ItemActions.closeItem();
                    InventoryInstance.openHoldingsAccordion(location.name);
                    InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                    ItemActions.edit();
                    ItemRecordEdit.addBarcode(barcodeForThirdItem);
                    ItemRecordEdit.save();
                    // Need to wait,while instance will be saved
                    cy.wait(5000);
                    ItemActions.closeItem();
                    InventoryInstance.openHoldingsAccordion(location.name);
                    InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                    ItemActions.edit();
                    ItemRecordEdit.addBarcode(barcodeForFourItem);
                    ItemRecordEdit.save();
                    // Need to wait,while instance will be saved
                    cy.wait(5000);
                    ItemActions.closeItem();
                    InventoryInstance.openHoldingsAccordion(location.name);
                    InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                    ItemActions.edit();
                    ItemRecordEdit.addBarcode(barcodeForFifthItem);
                    ItemRecordEdit.save();
                    // Need to wait,while instance will be saved
                    cy.wait(5000);
                    ItemActions.closeItem();
                    InventoryInstance.openHoldingsAccordion(location.name);
                    InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                    ItemActions.edit();
                    ItemRecordEdit.addBarcode(barcodeForSixthItem);
                    ItemRecordEdit.save();
                    // Need to wait,while instance will be saved
                    cy.wait(5000);
                    ItemActions.closeItem();
                    InventoryInstance.openHoldingsAccordion(location.name);
                    InventoryInstance.openItemByBarcodeAndIndex('No barcode');
                    ItemActions.edit();
                    ItemRecordEdit.addBarcode(barcodeForSeventhItem);
                    ItemRecordEdit.save();
                    // Need to wait,while instance will be saved
                    cy.wait(5000);
                    ItemActions.closeItem();
                  });

                cy.visit(TopMenu.checkInPath);
                SwitchServicePoint.switchServicePoint(circ2LocationServicePoint.name);
                SwitchServicePoint.checkIsServicePointSwitched(circ2LocationServicePoint.name);
                // Need to wait,while Checkin page will be loaded in same location
                cy.wait(2000);
                CheckInActions.checkInItemGui(barcodeForFirstItem);
                cy.wait(2000);
                CheckInActions.checkInItemGui(barcodeForSecondItem);
                SwitchServicePoint.switchServicePoint(circ1LocationServicePoint.name);
                SwitchServicePoint.checkIsServicePointSwitched(circ1LocationServicePoint.name);
                // Need to wait,while Checkin page will be loaded in same location
                cy.wait(2000);
                CheckInActions.checkInItemGui(barcodeForThirdItem);
                cy.wait(2000);
                CheckInActions.checkInItemGui(barcodeForFourItem);
              });
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

  //     // TODO: Need to find solution to delete all data, becouse now i cant delete location and user
  //   after(() => {
  //     Checkout.checkoutItemViaApi({
  //       id: uuid(),
  //       itemBarcode: barcodeForFirstItem,
  //       loanDate: moment.utc().format(),
  //       servicePointId: effectiveLocationServicePoint.id,
  //       userBarcode: user.barcode,
  //     });
  //     Checkout.checkoutItemViaApi({
  //       id: uuid(),
  //       itemBarcode: barcodeForSecondItem,
  //       loanDate: moment.utc().format(),
  //       servicePointId: effectiveLocationServicePoint.id,
  //       userBarcode: user.barcode,
  //     });
  //     cy.loginAsAdmin({ path:TopMenu.receivingPath, waiter: Receiving.waitLoading });
  //     Orders.searchByParameter('PO number', orderNumber);
  //     Receiving.selectFromResultsList();
  //     Receiving.unreceiveFromReceivedSection();
  //     cy.visit(TopMenu.ordersPath);
  //     Orders.searchByParameter('PO number', orderNumber);
  //     Orders.selectFromResultsList();
  //     Orders.reOpenOrder();
  //     Orders.unOpenOrder(orderNumber);
  //     OrderLines.selectPOLInOrder(0);
  //     OrderLines.deleteOrderLine();
  //     // Need to wait until the order is opened before deleting it
  //     cy.wait(2000);
  //     Orders.deleteOrderViaApi(order.id);

  //     Organizations.deleteOrganizationViaApi(organization.id);
  //     // TODO: Need to find solution to delete all data, becouse now i cant delete location and user
  //     // NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
  //     //     location.institutionId,
  //     //     location.campusId,
  //     //     location.libraryId,
  //     //     location.id
  //     //   );

  //     // Users.deleteViaApi(user.userId);
  //   });

  it('C367971 Item statuses are set to status other than "Order closed" or "On order" and are NOT changed to "In process" upon receiving (items for receiving includes "On order" statuses) (thunderjet)', { tags: [testType.smoke, devTeams.thunderjet] }, () => {
    Orders.searchByParameter('PO number', orderNumber);
    Receiving.selectLinkFromResultsList();
    Receiving.receiveFromExpectedSectionWithClosePOL();
    Receiving.receiveAll();
    Receiving.clickOnInstance();
    InventoryInstance.openHoldingsAccordion(location.name);
    InventoryInstance.openItemByBarcodeAndIndex(barcodeForFirstItem);
    ItemRecordView.checkItemDetails(location.name, barcodeForFirstItem, ITEM_STATUS_NAMES.AVAILABLE);
    ItemActions.closeItem();
    InventoryInstance.openHoldingsAccordion(location.name);
    InventoryInstance.openItemByBarcodeAndIndex(barcodeForSecondItem);
    ItemRecordView.checkItemDetails(location.name, barcodeForSecondItem, ITEM_STATUS_NAMES.AVAILABLE);
    ItemActions.closeItem();
    InventoryInstance.openHoldingsAccordion(location.name);
    InventoryInstance.openItemByBarcodeAndIndex(barcodeForThirdItem);
    ItemRecordView.checkItemDetails(location.name, barcodeForThirdItem, `${ITEM_STATUS_NAMES.IN_TRANSIT} to Circ Desk 2`);
    ItemActions.closeItem();
    InventoryInstance.openHoldingsAccordion(location.name);
    InventoryInstance.openItemByBarcodeAndIndex(barcodeForFourItem);
    ItemRecordView.checkItemDetails(location.name, barcodeForFourItem, `${ITEM_STATUS_NAMES.IN_TRANSIT} to Circ Desk 2`);
    ItemActions.closeItem();
    InventoryInstance.openHoldingsAccordion(location.name);
    InventoryInstance.openItemByBarcodeAndIndex(barcodeForSixthItem);
    ItemRecordView.checkItemDetails(location.name, barcodeForSixthItem, ITEM_STATUS_NAMES.IN_PROCESS);
    ItemActions.closeItem();
    InventoryInstance.openHoldingsAccordion(location.name);
    InventoryInstance.openItemByBarcodeAndIndex(barcodeForSeventhItem);
    ItemRecordView.checkItemDetails(location.name, barcodeForSeventhItem, ITEM_STATUS_NAMES.IN_PROCESS);
  });
});
