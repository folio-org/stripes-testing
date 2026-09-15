import { ORDER_LINE_FILTER_LABELS } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const users = {};
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    firstOrder: {},
    secondOrder: {},
    firstPoLine: {},
    secondPoLine: {},
    firstPoLineTitle: `AT_C466139_FolioInstance_FirstPoLine_${getRandomPostfix()}`,
    secondPoLineTitle: `AT_C466139_FolioInstance_SecondPoLine_${getRandomPostfix()}`,
  };

  const editPoLineViaApi = (poLineId, description) => {
    OrderLines.getOrderLineByIdViaApi(poLineId).then((poLine) => {
      OrderLines.updateOrderLineViaApi({ ...poLine, poLineDescription: description });
    });
  };

  before('Create test data and login', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);

    // Order #1 with one PO line
    Orders.createOrderWithOrderLineViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      BasicOrderLine.getDefaultOrderLine({ title: testData.firstPoLineTitle }),
    ).then((order) => {
      testData.firstOrder = order;

      OrderLines.getOrderLineViaApi({ query: `purchaseOrderId==${order.id}` }).then((poLines) => {
        testData.firstPoLine = poLines[0];
      });
    });

    // Order #2 with one PO line
    Orders.createOrderWithOrderLineViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      BasicOrderLine.getDefaultOrderLine({ title: testData.secondPoLineTitle }),
    ).then((order) => {
      testData.secondOrder = order;

      OrderLines.getOrderLineViaApi({ query: `purchaseOrderId==${order.id}` }).then((poLines) => {
        testData.secondPoLine = poLines[0];
      });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((firstUserProperties) => {
      users.firstUser = firstUserProperties;

      cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((secondUserProperties) => {
        users.secondUser = secondUserProperties;

        // User #2 edits "POL #1" and "POL #2" (not Orders)
        cy.getUserToken(users.secondUser.username, users.secondUser.password).then(() => {
          editPoLineViaApi(testData.firstPoLine.id, `AT_C466139_SecondUser_${getRandomPostfix()}`);
          editPoLineViaApi(testData.secondPoLine.id, `AT_C466139_SecondUser_${getRandomPostfix()}`);
        });

        // User #1 edits "POL #1" (not an Order)
        cy.getUserToken(users.firstUser.username, users.firstUser.password).then(() => {
          editPoLineViaApi(testData.firstPoLine.id, `AT_C466139_FirstUser_${getRandomPostfix()}`);
        });

        cy.login(users.firstUser.username, users.firstUser.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });

        // Select "Order lines" toggle on "Search & filter" pane
        Orders.selectOrderLines();
        OrderLines.waitLoading();
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.firstOrder.id);
    Orders.deleteOrderViaApi(testData.secondOrder.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(users.firstUser.userId);
    Users.deleteViaApi(users.secondUser.userId);
  });

  it(
    'C466139 PO lines can be found by "Updated by" filter (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466139'] },
    () => {
      // Step 1: Click "Reset all" button on "Search & filter" pane
      OrderLines.clearAllFilters();
      OrderLines.assertNoFiltersApplied();

      // Step 2-4: Expand the "Updated by" facet, click "Find user" link and select User #1
      OrderLines.filterByUpdatedBy(users.firstUser.username);
      OrderLines.assertResultsCount(1);
      OrderLines.assertTitlesInResults([testData.firstPoLineTitle]);

      // Step 5: Click "Reset all" button on "Search & filter" pane
      OrderLines.clearAllFilters();
      OrderLines.assertNoFiltersApplied();

      // Step 6-7: Click "Find user" link in "Updated by" facet and select User #2
      OrderLines.filterByUpdatedBy(users.secondUser.username);
      OrderLines.assertResultsCount(1);
      OrderLines.assertTitlesInResults([testData.secondPoLineTitle]);

      // Step 8: Click "x" icon next to "Updated by" filter
      OrderLines.clearFilter(ORDER_LINE_FILTER_LABELS.UPDATED_BY);
      OrderLines.assertNoFiltersApplied();
    },
  );
});
