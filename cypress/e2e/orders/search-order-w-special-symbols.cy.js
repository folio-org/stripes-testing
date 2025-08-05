import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const instanceTitle =
    "Lorem ipsum > =~ simp/y dum*y [text]!? -|+ 0f the $pr,{int}ing & 'typ%setting' \"industry\". \\orem ipsum: #as been the industry's stand@rd, dummy text ever < (since- the 15";
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      InventoryInstance.createInstanceViaApi({
        instanceTitle,
      }).then(({ instanceData }) => {
        testData.instance = instanceData;

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({ title: instanceTitle });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({
                ...testData.order,
                workflowStatus: ORDER_STATUSES.OPEN,
              });
            },
          );
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
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C380409 Search for order title with special characters (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      // Enter full title name from Preconditions item #2 in "Search" field on "Search & filter" pane
      // Click "Search" button
      OrderLines.searchByParameter('Keyword', instanceTitle.split(' ').slice(0, 2).join(' '));

      // Title from PO line appears in search results on "Order lines" pane.
      OrderLines.checkOrderlineSearchResults({ title: instanceTitle });
    },
  );
});
