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

const { CREATED_BY, EXPECTED_RECEIPT_DATE, ORDER_STATUS, RECEIPT_DUE, RECEIVED_DATE } =
  RECEIVING_TITLE_FILTER_LABELS;
const futureDateObj = DateTools.getFutureWeekDateObj();
const futureDate = DateTools.getFormattedDate({ date: futureDateObj }, 'MM/DD/YYYY');
const futureDateForApi = `${DateTools.getFormattedDate({ date: futureDateObj })}T12:00:00.000+00:00`;
const dateRange = { from: DateTools.getPreviousDayDate(), to: futureDate };

describe('Receiving', () => {
  let testData;

  before('Create test data and login', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C466058_Organization_${postfix}`,
      },
      firstTitle: `AT_C466058_FolioInstance_FirstPoLine_${postfix}`,
      secondTitle: `AT_C466058_FolioInstance_SecondPoLine_${postfix}`,
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

    [0, 1].forEach((index) => {
      cy.createTempUser([]).then((userProperties) => {
        testData.users[index] = userProperties;

        cy.assignCapabilitiesToExistingUser(
          userProperties.userId,
          [],
          [
            CapabilitySets.uiOrdersOrdersCreate,
            CapabilitySets.uiOrdersOrdersEdit,
            CapabilitySets.uiReceivingCreate,
            CapabilitySets.uiInventory,
          ],
        );
      });
    });

    // User #1 creates and opens Order #1 (with "Expected receipt date"),
    // User #2 creates and opens Order #2 (with "Receipt due"); related pieces are received
    cy.then(() => {
      [
        { title: testData.firstTitle, physical: { expectedReceiptDate: futureDateForApi } },
        { title: testData.secondTitle, physical: { receiptDue: futureDateForApi } },
      ].forEach(({ title, physical }, index) => {
        const { username, password } = testData.users[index];
        const defaultOrderLine = BasicOrderLine.getDefaultOrderLine({
          title,
          specialLocationId: testData.location.id,
          specialMaterialTypeId: testData.materialType.id,
        });
        const orderLine = {
          ...defaultOrderLine,
          physical: {
            ...defaultOrderLine.physical,
            materialSupplier: testData.organization.id,
            ...physical,
          },
        };

        cy.getUserToken(username, password);
        Orders.createOrderWithOrderLineViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          orderLine,
        ).then((order) => {
          testData.orders[index] = order;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLines[index] = openedOrderLine;
          });
          Receivings.getPiecesViaApi(orderLine.id).then(([piece]) => {
            Receivings.receivePieceViaApi({ poLineId: orderLine.id, pieces: [{ id: piece.id }] });
          });
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
    'C466058 Receiving titles can be found by "Created by", "Received date", "Expected receipt date" and "Receipt due" filters (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466058'] },
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

      // Steps 2-4: Expand "Created by" facet, click "Find user" link and select User #1
      Receivings.filterByUser(CREATED_BY, firstUser.username);
      Receivings.verifyUserFilterSelected(CREATED_BY, firstUser.username);
      Receivings.assertReceivingResults([firstTitle]);

      // Step 5: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();

      // Steps 6-7: Click "Find user" link and select User #2
      Receivings.filterByUser(CREATED_BY, secondUser.username);
      Receivings.verifyUserFilterSelected(CREATED_BY, secondUser.username);
      Receivings.assertReceivingResults([secondTitle]);

      // Steps 8-9: Click "Find user" link and select User #1
      Receivings.filterByUser(CREATED_BY, firstUser.username);
      Receivings.verifyUserFilterSelected(CREATED_BY, firstUser.username);
      Receivings.assertReceivingResults([firstTitle]);

      // Step 10: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();

      // Step 11: Select "Open" option in "Order status" filter
      // Additionally filter by the test vendor to limit results to the test titles only
      Receivings.filterBySelect(ORDER_STATUS, ORDER_STATUSES.OPEN);
      Receivings.filterByVendor(organization.name);
      Receivings.assertReceivingResults([firstTitle, secondTitle]);

      // Steps 12-13: Fill "From" and "To" fields in "Received date" filter and click "Apply"
      Receivings.filterByDateRange(RECEIVED_DATE, dateRange);
      Receivings.assertDateRangeFilterValues(RECEIVED_DATE, dateRange);
      Receivings.assertReceivingResults([firstTitle, secondTitle]);

      // Step 14: Click "x" button next to "Received date" accordion
      Receivings.clearFilter(RECEIVED_DATE);
      Receivings.assertDateRangeFilterValues(RECEIVED_DATE, { from: '', to: '' });

      // Steps 15-16: Fill "From" and "To" fields in "Expected receipt date" filter and click "Apply"
      Receivings.filterByDateRange(EXPECTED_RECEIPT_DATE, dateRange);
      Receivings.assertDateRangeFilterValues(EXPECTED_RECEIPT_DATE, dateRange);
      Receivings.assertReceivingResults([firstTitle]);

      // Step 17: Click "x" button next to "Expected receipt date" accordion
      Receivings.clearFilter(EXPECTED_RECEIPT_DATE);
      Receivings.assertDateRangeFilterValues(EXPECTED_RECEIPT_DATE, { from: '', to: '' });

      // Steps 18-20: Expand "Receipt due" accordion, fill "From" and "To" fields and click "Apply"
      Receivings.filterByDateRange(RECEIPT_DUE, dateRange);
      Receivings.assertDateRangeFilterValues(RECEIPT_DUE, dateRange);
      Receivings.assertReceivingResults([secondTitle]);
    },
  );
});
