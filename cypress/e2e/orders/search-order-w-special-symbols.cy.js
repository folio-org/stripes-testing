import { Permissions } from '../../support/dictionary';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('Orders', () => {
  const instanceTitle =
    "Lorem ipsum > =~ simp/y dum*y [text]!? -|+ 0f the $pr,{int}ing & 'typ%setting' \"industry\". \\orem ipsum: #as been the industry's stand@rd, dummy text ever < (since- the 15";
  const testData = {
    user: {},
  };
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: false,
    reEncumber: false,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before('Create test data', () => {
    cy.getAdminToken();
    cy.loginAsAdmin().then(() => {
      InventoryInstance.createInstanceViaApi({
        instanceTitle,
      }).then(({ instanceData }) => {
        testData.instance = instanceData;

        Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
          organization.id = responseOrganizations;
          order.vendor = organization.name;
          TopMenuNavigation.openAppFromDropdown('Orders');
          Orders.selectOrdersPane();
          Orders.createOrder(order, true).then((orderId) => {
            order.id = orderId;
            Orders.checkCreatedOrder(order);
            OrderLines.addPOLine();
            OrderLines.POLineInfodorPhysicalMaterial(instanceTitle);
            OrderLines.backToEditingOrder();
            Orders.openOrder();
          });
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersView.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.orderLinesPath,
        waiter: OrderLines.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(organization.id);
      Orders.deleteOrderViaApi(order.id);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C380409 Search for order title with special characters (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C380409'] },
    () => {
      // Enter full title name from Preconditions item #2 in "Search" field on "Search & filter" pane
      // Click "Search" button
      OrderLines.searchByParameter('Keyword', instanceTitle.split(' ').slice(0, 2).join(' '));

      // Title from PO line appears in search results on "Order lines" pane.
      OrderLines.checkOrderlineSearchResults({ title: instanceTitle });
    },
  );
});
