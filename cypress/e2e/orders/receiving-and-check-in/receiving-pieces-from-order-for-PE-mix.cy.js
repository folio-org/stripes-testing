import { ITEM_STATUS_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

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

    let orderNumber;
    let user;
    let effectiveLocationServicePoint;
    let location;

    before(() => {
      cy.getAdminToken();

      ServicePoints.getCircDesk2ServicePointViaApi().then((servicePoint) => {
        effectiveLocationServicePoint = servicePoint;
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
              locationResponse.name,
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
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C738 Receiving pieces from an order for P/E MIx that is set to create Items in inventory (items for receiving includes "Order closed" statuses) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C738'] },
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
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForFirstItem);
        InventoryItems.closeItem();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForSecondItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForSecondItem,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );
        InventoryItems.closeItem();
        InventorySearchAndFilter.switchToItem();
      },
    );
  });
});
