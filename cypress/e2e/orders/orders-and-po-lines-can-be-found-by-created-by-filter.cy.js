import {
  ORDER_LINE_FILTER_LABELS,
  ORDER_RESULTS_LIST_COLUMN_LABELS,
} from '../../support/constants';
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
    firstPoLineTitle: `AT_C466132_FolioInstance_FirstPoLine_${getRandomPostfix()}`,
    secondPoLineTitle: `AT_C466132_FolioInstance_SecondPoLine_${getRandomPostfix()}`,
  };

  before('Create test data and login', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);

    // User #1 creates Order #1 with one PO line
    cy.createTempUser([Permissions.uiOrdersCreate.gui]).then((userProperties) => {
      users.firstUser = userProperties;

      cy.getUserToken(users.firstUser.username, users.firstUser.password).then(() => {
        const order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
        const orderLine = BasicOrderLine.getDefaultOrderLine({
          title: testData.firstPoLineTitle,
        });

        Orders.createOrderWithOrderLineViaApi(order, orderLine).then((orderWithLine) => {
          testData.firstOrder = orderWithLine;
        });
      });
    });

    // User #2 creates Order #2 with one PO line
    cy.getAdminToken();
    cy.createTempUser([Permissions.uiOrdersCreate.gui]).then((userProperties) => {
      users.secondUser = userProperties;

      cy.getUserToken(users.secondUser.username, users.secondUser.password).then(() => {
        const order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
        const orderLine = BasicOrderLine.getDefaultOrderLine({
          title: testData.secondPoLineTitle,
        });

        Orders.createOrderWithOrderLineViaApi(order, orderLine).then((orderWithLine) => {
          testData.secondOrder = orderWithLine;
        });
      });

      cy.login(users.secondUser.username, users.secondUser.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
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
    'C466132 Orders and PO lines can be found by "Created by" filter (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466132'] },
    () => {
      // Step 1: Click "Reset all" button on "Search & filter" pane
      Orders.verifyOrdersResultsPaneContentExists();
      Orders.resetAllFilters();
      Orders.assertNoFiltersApplied();

      // Step 2-3: Expand the "Created by" filtering facet, click "Find user" link and select User #1
      Orders.filterByCreatedBy(users.firstUser.username);
      Orders.assertOrdersResults([
        [
          {
            column: ORDER_RESULTS_LIST_COLUMN_LABELS.PO_NUMBER,
            content: testData.firstOrder.poNumber,
          },
        ],
      ]);
      Orders.checkSearchResults(testData.firstOrder.poNumber);
      Orders.assertResultsCount(1);

      // Step 4: Click "Reset all" button on "Search & filter" pane
      Orders.resetAllFilters();
      Orders.assertNoFiltersApplied();

      // Step 5: Click "Find user" link and select User #2
      Orders.filterByCreatedBy(users.secondUser.username);
      Orders.assertOrdersResults([
        [
          {
            column: ORDER_RESULTS_LIST_COLUMN_LABELS.PO_NUMBER,
            content: testData.secondOrder.poNumber,
          },
        ],
      ]);
      Orders.checkSearchResults(testData.secondOrder.poNumber);
      Orders.assertResultsCount(1);

      // Step 6: Click "Find user" link and select User #1
      Orders.filterByCreatedBy(users.firstUser.username);
      Orders.checkSearchResults(testData.firstOrder.poNumber);
      Orders.assertResultsCount(1);

      // Step 7: Click "Order lines" toggle and click "Reset all" button
      Orders.selectOrderLines();
      OrderLines.waitLoading();
      OrderLines.clearAllFilters();
      OrderLines.assertNoFiltersApplied();

      // Step 8-9: Expand the "Created by" filtering facet, search for User #1 and select it
      OrderLines.filterByCreatedBy(users.firstUser.username);
      OrderLines.assertResultsCount(1);
      OrderLines.assertTitlesInResults([testData.firstPoLineTitle]);

      // Step 10: Click "Reset all" button on "Search & filter" pane
      OrderLines.clearAllFilters();
      OrderLines.assertNoFiltersApplied();

      // Step 11: Search for User #2 and select it
      OrderLines.filterByCreatedBy(users.secondUser.username);
      OrderLines.assertResultsCount(1);
      OrderLines.assertTitlesInResults([testData.secondPoLineTitle]);

      // Step 12: Click "x" icon next to "Created by" filter
      OrderLines.clearFilter(ORDER_LINE_FILTER_LABELS.CREATED_BY);
      OrderLines.assertNoFiltersApplied();
    },
  );
});
