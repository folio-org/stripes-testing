import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import testType from '../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
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
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';

describe('Orders: Inventory interaction', () => {
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

  let orderNumber;
  let user;
  let effectiveLocationServicePoint;
  let firstLocation;
  let instanceRecord = null;
  let secondLocation;

  before(() => {
    cy.getAdminToken();
    InventorySearchAndFilter.createInstanceViaApi().then(({ instanceData }) => {
      instanceRecord = instanceData;
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' })
        .then((servicePoints) => {
          effectiveLocationServicePoint = servicePoints[0];
          NewLocation.createViaApi(NewLocation.getDefaultLocation(effectiveLocationServicePoint.id))
            .then((firstLocationResponse) => {
              firstLocation = firstLocationResponse;
              Organizations.createOrganizationViaApi(organization)
                .then(organizationsResponse => {
                  organization.id = organizationsResponse;
                  order.vendor = organizationsResponse;
                });
              NewLocation.createViaApi(NewLocation.getDefaultLocation(effectiveLocationServicePoint.id))
                .then((secondLocationResponse) => {
                  secondLocation = secondLocationResponse;
                  cy.loginAsAdmin(); cy.visit(TopMenu.inventoryPath).then(() => {
                    InventoryInstance.searchByTitle(`${instanceRecord.instanceTitle}`);
                    InventoryInstances.selectInstance();
                    InventoryInstance.pressAddHoldingsButton();
                    InventoryNewHoldings.fillRequiredFields(`${firstLocation.name} (${firstLocation.code}) `);
                    InventoryNewHoldings.saveAndClose();
                    InventoryInstance.waitLoading();
                  });
                  cy.loginAsAdmin({ path:TopMenu.ordersPath, waiter: Orders.waitLoading });
                  cy.createOrderApi(order)
                    .then((response) => {
                      orderNumber = response.body.poNumber;
                      Orders.searchByParameter('PO number', orderNumber);
                      Orders.selectFromResultsList(orderNumber);
                      Orders.createPOLineViaActions();
                      OrderLines.selectRandomInstanceInTitleLookUP(`${instanceRecord.instanceTitle}`, 0);
                      OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(`${organization.accounts[0].name} (${organization.accounts[0].accountNo})`, 'Purchase', firstLocation.institutionId, '2');
                      OrderLines.backToEditingOrder();
                    });
                });
            });
        });
    });
    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiInventoryViewCreateEditItems.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.ordersPath, waiter: Orders.waitLoading });
      });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it('C375238 Create new holdings for already existing location when editing an order line (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    OrderLines.selectPOLInOrder(0);
    OrderLines.editPOLInOrder();
    OrderLines.selectRandomInstanceInTitleLookUP(`${instanceRecord.instanceTitle}`, 0);
    OrderLines.edeiPOLineInfoAndChangeLocation(`${organization.accounts[0].name} (${organization.accounts[0].accountNo})`, 'Purchase', secondLocation.institutionId, '2');
    OrderLines.backToEditingOrder();
    Orders.openOrder();
    OrderLines.selectPOLInOrder(0);
    OrderLines.openLinkedInstance();
    InventoryInstance.checkIsHoldingsCreated([`${firstLocation.name} >`]);
    InventoryInstance.checkIsHoldingsCreated([`${secondLocation.name} >`]);
    InventoryInstance.openHoldingsAccordion(secondLocation.name);
    InventoryInstance.openItemByBarcodeAndIndex('No barcode');
    ItemActions.edit();
    ItemRecordEdit.addBarcode(barcodeForFirstItem);
    ItemRecordEdit.save();
    // Need to wait,while instance will be saved
    cy.wait(5000);
    ItemActions.closeItem();
    InventoryInstance.openHoldingsAccordion(secondLocation.name);
    InventoryInstance.openItemByBarcodeAndIndex('No barcode');
    ItemActions.edit();
    ItemRecordEdit.addBarcode(barcodeForSecondItem);
    ItemRecordEdit.save();
    // Need to wait,while instance will be saved
    cy.wait(5000);
    ItemActions.closeItem();
    InventoryInstance.openHoldingsAccordion(secondLocation.name);
    InventoryInstance.openItemByBarcodeAndIndex(barcodeForFirstItem);
    ItemRecordView.checkItemDetails(secondLocation.name, barcodeForFirstItem, ITEM_STATUS_NAMES.ON_ORDER);
    ItemActions.closeItem();
    InventoryInstance.openHoldingsAccordion(secondLocation.name);
    InventoryInstance.openItemByBarcodeAndIndex(barcodeForSecondItem);
    ItemRecordView.checkItemDetails(secondLocation.name, barcodeForSecondItem, ITEM_STATUS_NAMES.ON_ORDER);
    ItemActions.closeItem();
  });
});
