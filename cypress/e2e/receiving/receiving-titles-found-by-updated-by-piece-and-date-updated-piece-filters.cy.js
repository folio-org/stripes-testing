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

const { DATE_UPDATED_PIECE, UPDATED_BY_PIECE } = RECEIVING_TITLE_FILTER_LABELS;
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
        name: `AT_C466107_Organization_${postfix}`,
      },
      firstTitle: `AT_C466107_FolioInstance_FirstPoLine_${postfix}`,
      secondTitle: `AT_C466107_FolioInstance_SecondPoLine_${postfix}`,
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

    // In sequence: User #2 receives Pieces of Order #1 and Order #2,
    // then User #1 unreceives Piece of Order #1 (last update of Order #1 Piece is by User #1)
    cy.then(() => {
      const [firstOrderLine, secondOrderLine] = testData.orderLines;

      cy.getUserToken(testData.users[1].username, testData.users[1].password);
      [firstOrderLine, secondOrderLine].forEach(({ id: poLineId }) => {
        Receivings.getPiecesViaApi(poLineId).then(([piece]) => {
          Receivings.receivePieceViaApi({ poLineId, pieces: [{ id: piece.id }] });
        });
      });

      cy.getUserToken(testData.users[0].username, testData.users[0].password);
      Receivings.getPiecesViaApi(firstOrderLine.id).then(([piece]) => {
        Receivings.unreceivePiecesViaApi({ poLineId: firstOrderLine.id, pieceIds: [piece.id] });
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
    'C466107 Receiving titles can be found by "Updated by (Piece)" and "Date updated (Piece)" filters (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466107'] },
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

      // Steps 2-4: Expand "Updated by (Piece)" facet, click "Find user" link and select User #1
      Receivings.filterByUser(UPDATED_BY_PIECE, firstUser.username);
      Receivings.verifyUserFilterSelected(UPDATED_BY_PIECE, firstUser.username);
      Receivings.assertReceivingResults([firstTitle]);

      // Step 5: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();

      // Steps 6-7: Click "Find user" link and select User #2
      // POL#1 is not displayed, because the last update of its Piece was made by User #1
      Receivings.filterByUser(UPDATED_BY_PIECE, secondUser.username);
      Receivings.verifyUserFilterSelected(UPDATED_BY_PIECE, secondUser.username);
      Receivings.assertReceivingResults([secondTitle]);

      // Step 8: Click "x" icon next to "Updated by (Piece)" filter
      Receivings.clearFilter(UPDATED_BY_PIECE);
      Receivings.verifyUserFilterSelected(UPDATED_BY_PIECE, '');
      Receivings.verifyChooseFilterMessage();

      // Steps 9-11: Expand "Date updated (Piece)" facet, select today in both fields, click "Apply"
      // The vendor filter limits the results to the titles of this test
      Receivings.filterByVendor(organization.name);
      Receivings.filterByDateRange(DATE_UPDATED_PIECE, { from: today, to: today });
      Receivings.assertDateRangeFilterValues(DATE_UPDATED_PIECE, { from: today, to: today });
      Receivings.assertReceivingResults([firstTitle, secondTitle]);

      // Step 12: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();

      // Steps 13-14: Select dates in the past in "From" and "To" fields, click "Apply"
      Receivings.filterByVendor(organization.name);
      Receivings.filterByDateRange(DATE_UPDATED_PIECE, { from: pastDateFrom, to: pastDateTo });
      Receivings.assertDateRangeFilterValues(DATE_UPDATED_PIECE, {
        from: pastDateFrom,
        to: pastDateTo,
      });
      Receivings.assertReceivingResults([]);

      // Step 15: Enter date in "To" field earlier than date in "From" field, click "Apply"
      Receivings.filterByDateRange(DATE_UPDATED_PIECE, { to: dateEarlierThanFrom });
      Receivings.verifyDateRangeFilterError(
        DATE_UPDATED_PIECE,
        START_DATE_GREATER_THAN_END_DATE_ERROR,
      );
      Receivings.assertDateRangeFilterValues(DATE_UPDATED_PIECE, {
        from: pastDateFrom,
        to: dateEarlierThanFrom,
      });
      Receivings.assertReceivingResults([]);

      // Step 16: Select yesterday date in "From" field, today date in "To" field, click "Apply"
      Receivings.filterByDateRange(DATE_UPDATED_PIECE, { from: yesterday, to: today });
      Receivings.assertDateRangeFilterValues(DATE_UPDATED_PIECE, { from: yesterday, to: today });
      Receivings.assertReceivingResults([firstTitle, secondTitle]);
    },
  );
});
