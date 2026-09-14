import { ORDER_RESULTS_LIST_COLUMN_LABELS } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  Orders,
} from '../../support/fragments/orders';
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
    poLineTitle: `AT_C466133_FolioInstance_${getRandomPostfix()}`,
    receivingNote: `AT_C466133_ReceivingNote_${getRandomPostfix()}`,
  };

  const editOrderViaApi = (orderId, note) => {
    Orders.getOrderByIdViaApi(orderId).then((order) => {
      Orders.updateOrderViaApi({ ...order, notes: [note] });
    });
  };

  before('Create test data and login', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);

    // Order #1 without PO lines
    Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: testData.organization.id })).then(
      (order) => {
        testData.firstOrder = order;
      },
    );

    // Order #2 with one PO line
    Orders.createOrderWithOrderLineViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      BasicOrderLine.getDefaultOrderLine({ title: testData.poLineTitle }),
    ).then((orderWithLine) => {
      testData.secondOrder = orderWithLine;
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((firstUserProperties) => {
      users.firstUser = firstUserProperties;

      cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((secondUserProperties) => {
        users.secondUser = secondUserProperties;

        // User #2 edits Order #1 and Order #2 (not PO line)
        cy.getUserToken(users.secondUser.username, users.secondUser.password).then(() => {
          editOrderViaApi(testData.firstOrder.id, `AT_C466133_SecondUser_${getRandomPostfix()}`);
          editOrderViaApi(testData.secondOrder.id, `AT_C466133_SecondUser_${getRandomPostfix()}`);
        });

        // User #1 edits Order #1
        cy.getUserToken(users.firstUser.username, users.firstUser.password).then(() => {
          editOrderViaApi(testData.firstOrder.id, `AT_C466133_FirstUser_${getRandomPostfix()}`);
        });

        cy.login(users.firstUser.username, users.firstUser.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
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
    'C466133 Orders can be found by "Updated by" filter (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466133'] },
    () => {
      // Step 1: Click "Reset all" button on "Search & filter" pane
      Orders.verifyOrdersResultsPaneContentExists();
      Orders.resetAllFilters();
      Orders.assertNoFiltersApplied();

      // Step 2-4: Expand the "Updated by" facet, click "Find user" link and select User #1
      Orders.filterByUpdatedBy(users.firstUser.username);
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

      // Step 5: Click "Reset all" button on "Search & filter" pane
      Orders.resetAllFilters();
      Orders.assertNoFiltersApplied();

      // Step 6-7: Click "Find user" link in "Updated by" facet and select User #2
      Orders.filterByUpdatedBy(users.secondUser.username);
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

      // Step 8: Edit PO line of "Order #2" - add "Receiving note" and save
      Orders.selectFromResultsList(testData.secondOrder.poNumber);
      OrderDetails.openPolDetails(testData.poLineTitle);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { receivingNote: testData.receivingNote },
      });
      OrderLineEditForm.clickSaveButton();

      // Step 9-10: Expand the "Updated by" facet, click "Find user" link and select User #1
      OrderLineDetails.backToOrderDetails();
      OrderDetails.closeOrderDetails();
      Orders.waitLoading();
      Orders.resetAllFilters();
      Orders.assertNoFiltersApplied();
      Orders.filterByUpdatedBy(users.firstUser.username);
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
    },
  );
});
