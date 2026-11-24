import {
  APPLICATION_NAMES,
  ORDER_STATUSES,
  RECEIVING_TITLE_FILTER_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstances } from '../../support/fragments/inventory';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Receivings } from '../../support/fragments/receiving';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

const { DATE_UPDATED, UPDATED_BY } = RECEIVING_TITLE_FILTER_LABELS;
const START_DATE_GREATER_THAN_END_DATE_ERROR = 'Start date is greater than end date';
const DATE_FORMAT = 'MM/DD/YYYY';
const today = DateTools.getCurrentDate();
const yesterday = DateTools.getPreviousDayDate();
const pastDateFrom = DateTools.getFormattedDate({ date: DateTools.addDays(-10) }, DATE_FORMAT);
const pastDateTo = DateTools.getFormattedDate({ date: DateTools.addDays(-5) }, DATE_FORMAT);
const dateEarlierThanFrom = DateTools.getFormattedDate(
  { date: DateTools.addDays(-15) },
  DATE_FORMAT,
);

describe('Receiving', () => {
  let testData;

  before('Create test data and login', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C466059_Organization_${postfix}`,
      },
      firstTitle: `AT_C466059_FolioInstance_FirstPoLine_${postfix}`,
      secondTitle: `AT_C466059_FolioInstance_SecondPoLine_${postfix}`,
      users: [],
      orders: [],
      orderLines: [],
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then(([location]) => {
      testData.location = location;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });

    // Two Orders in "Open" status with synchronized workflow and one PO line each
    cy.then(() => {
      [testData.firstTitle, testData.secondTitle].forEach((title, index) => {
        const defaultOrderLine = BasicOrderLine.getDefaultOrderLine({
          title,
          specialLocationId: testData.location.id,
          specialMaterialTypeId: testData.materialType.id,
        });
        const orderLine = {
          ...defaultOrderLine,
          physical: { ...defaultOrderLine.physical, materialSupplier: testData.organization.id },
        };

        Orders.createOrderWithOrderLineViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          orderLine,
        ).then((order) => {
          testData.orders[index] = order;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLines[index] = openedOrderLine;
          });
        });
      });
    });

    [0, 1].forEach((index) => {
      cy.createTempUser([]).then((userProperties) => {
        testData.users[index] = userProperties;

        cy.assignCapabilitiesToExistingUser(
          userProperties.userId,
          [],
          [
            CapabilitySets.uiOrdersOrdersView,
            CapabilitySets.uiReceivingEdit,
            CapabilitySets.uiInventory,
          ],
        );
      });
    });

    // In sequence: User #2 edits Title of Order #1 and Title of Order #2,
    // then User #1 edits Title of Order #1 (the last update of Order #1 Title is made by User #1)
    cy.then(() => {
      const publisher = `AT_C466059_Publisher_${postfix}`;

      [
        { userIndex: 1, orderIndex: 0, changes: { publisher } },
        { userIndex: 1, orderIndex: 1, changes: { publisher } },
        { userIndex: 0, orderIndex: 0, changes: { edition: '2' } },
      ].forEach(({ userIndex, orderIndex, changes }) => {
        const { username, password } = testData.users[userIndex];

        cy.getUserToken(username, password);
        Receivings.getTitleByPoLineIdViaApi(testData.orderLines[orderIndex].id).then((title) => {
          Receivings.updateTitleViaApi({ ...title, ...changes });
        });
      });
    });

    cy.then(() => {
      cy.login(testData.users[1].username, testData.users[1].password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.orders.forEach((order) => Orders.deleteOrderViaApi(order.id));
    testData.orderLines.forEach((orderLine) => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(orderLine.instanceId);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    testData.users.forEach((user) => Users.deleteViaApi(user.userId));
  });

  it(
    'C466059 Receiving titles can be found by "Updated by" and "Date updated" filters (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466059'] },
    () => {
      const {
        organization,
        firstTitle,
        secondTitle,
        users: [firstUser, secondUser],
      } = testData;

      // Step 1: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();

      // Steps 2-4: Expand "Updated by" facet, click "Find user" link and select User #1
      Receivings.filterByUser(UPDATED_BY, firstUser.username);
      Receivings.verifyUserFilterSelected(UPDATED_BY, firstUser.username);
      Receivings.assertReceivingResults([firstTitle]);

      // Step 5: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();

      // Steps 6-7: Click "Find user" link and select User #2
      // POL#1 is not displayed, because the last update of its Title was made by User #1
      Receivings.filterByUser(UPDATED_BY, secondUser.username);
      Receivings.verifyUserFilterSelected(UPDATED_BY, secondUser.username);
      Receivings.assertReceivingResults([secondTitle]);

      // Steps 8-9: Click "Find user" link and select User #1
      Receivings.filterByUser(UPDATED_BY, firstUser.username);
      Receivings.verifyUserFilterSelected(UPDATED_BY, firstUser.username);
      Receivings.assertReceivingResults([firstTitle]);

      // Step 10: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();

      // Steps 11-13: Expand "Date updated" facet, select today in "From" and "To", click "Apply"
      // The vendor filter limits the results to the titles of this test
      Receivings.filterByVendor(organization.name);
      Receivings.filterByDateRange(DATE_UPDATED, { from: today, to: today });
      Receivings.assertDateRangeFilterValues(DATE_UPDATED, { from: today, to: today });
      Receivings.assertReceivingResults([firstTitle, secondTitle]);

      // Step 14: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();

      // Steps 15-16: Select dates in the past in "From" and "To" fields, click "Apply"
      Receivings.filterByVendor(organization.name);
      Receivings.filterByDateRange(DATE_UPDATED, { from: pastDateFrom, to: pastDateTo });
      Receivings.assertDateRangeFilterValues(DATE_UPDATED, { from: pastDateFrom, to: pastDateTo });
      Receivings.assertReceivingResults([]);

      // Step 17: Enter date in "To" field earlier than date in "From" field, click "Apply"
      Receivings.filterByDateRange(DATE_UPDATED, { to: dateEarlierThanFrom });
      Receivings.verifyDateRangeFilterError(DATE_UPDATED, START_DATE_GREATER_THAN_END_DATE_ERROR);
      Receivings.assertReceivingResults([]);

      // Step 18: Select yesterday date in "From" field, today date in "To" field, click "Apply"
      Receivings.filterByDateRange(DATE_UPDATED, { from: yesterday, to: today });
      Receivings.assertDateRangeFilterValues(DATE_UPDATED, { from: yesterday, to: today });
      Receivings.assertReceivingResults([firstTitle, secondTitle]);
    },
  );
});
