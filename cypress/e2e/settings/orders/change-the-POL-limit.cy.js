import { APPLICATION_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLinesLimit from '../../../support/fragments/settings/orders/orderLinesLimit';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const testData = {};
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      approved: true,
    };
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
    };

    before(() => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.firstInstance = instanceData;
      });
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.secondInstance = instanceData;
      });
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResponse) => {
          testData.location = locationResponse;
        },
      );
      Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
        organization.id = organizationsResponse;
        order.vendor = organizationsResponse;

        cy.createOrderApi(order).then((response) => {
          testData.orderNumber = response.body.poNumber;
        });
      });
      OrderLinesLimit.setPOLLimitViaApi(2);

      cy.createTempUser([
        Permissions.uiOrdersCreate.gui,
        Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
      });
    });

    after(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(order.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      InventoryInstance.deleteInstanceViaApi(testData.firstInstance.instanceId);
      InventoryInstance.deleteInstanceViaApi(testData.secondInstance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    // may be flaky due to concurrency issues because POL limit is changing in some tests
    it(
      'C668 Change the purchase order lines limit, then create POs with PO Lines of (PO Line limit + 1), to see how the order app behaves (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C668'] },
      () => {
        Orders.searchByParameter('PO number', testData.orderNumber);
        Orders.selectFromResultsList(testData.orderNumber);
        Orders.createPOLineViaActions();
        OrderLines.fillPolByLinkTitle(testData.firstInstance.instanceTitle);
        OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
          'Purchase',
          testData.location.name,
          '4',
        );
        OrderLines.backToEditingOrder();
        Orders.createPOLineViaActions();

        OrderLines.fillPolByLinkTitle(testData.secondInstance.instanceTitle);
        OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
          'Purchase',
          testData.location.name,
          '4',
        );
        OrderLines.backToEditingOrder();
        Orders.createPOLineViaActions();
        Orders.checkPurchaseOrderLineLimitReachedModal();
      },
    );
  });
});
