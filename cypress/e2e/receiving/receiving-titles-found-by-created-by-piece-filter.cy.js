import {
  APPLICATION_NAMES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
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
import getRandomPostfix from '../../support/utils/stringTools';

const { CREATED_BY_PIECE } = RECEIVING_TITLE_FILTER_LABELS;

describe('Receiving', () => {
  let testData;

  before('Create test data and login', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C466106_Organization_${postfix}`,
      },
      firstTitle: `AT_C466106_FolioInstance_FirstPoLine_${postfix}`,
      secondTitle: `AT_C466106_FolioInstance_SecondPoLine_${postfix}`,
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

    // Two Orders in "Open" status with independent workflow and one PO line each
    cy.then(() => {
      [testData.firstTitle, testData.secondTitle].forEach((title, index) => {
        const defaultOrderLine = BasicOrderLine.getDefaultOrderLine({
          title,
          checkinItems: true,
          specialLocationId: testData.location.id,
          specialMaterialTypeId: testData.materialType.id,
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
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
            CapabilitySets.uiReceivingCreate,
            CapabilitySets.uiInventory,
            CapabilitySets.uiInventoryInstanceView,
          ],
        );
      });
    });

    // User #1 adds a Piece to the Title of Order #1, User #2 adds a Piece to the Title of Order #2
    cy.then(() => {
      testData.orderLines.forEach((orderLine, index) => {
        const { username, password } = testData.users[index];

        cy.getUserToken(username, password);
        Receivings.addPieceViaApi(
          {
            poLineId: orderLine.id,
            poLineNumber: orderLine.poLineNumber,
            format: orderLine.orderFormat,
          },
          { locationId: testData.location.id },
        );
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
    'C466106 Receiving titles can be found by "Created by (Piece)" filter (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466106'] },
    () => {
      const {
        firstTitle,
        secondTitle,
        users: [firstUser, secondUser],
      } = testData;

      // Step 1: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();

      // Steps 2-4: Expand "Created by (Piece)" facet, click "Find user" link and select User #1
      Receivings.filterByUser(CREATED_BY_PIECE, firstUser.username);
      Receivings.verifyUserFilterSelected(CREATED_BY_PIECE, firstUser.username);
      Receivings.assertReceivingResults([firstTitle]);

      // Step 5: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();
      Receivings.verifyUserFilterSelected(CREATED_BY_PIECE, '');

      // Steps 6-7: Click "Find user" link and select User #2
      Receivings.filterByUser(CREATED_BY_PIECE, secondUser.username);
      Receivings.verifyUserFilterSelected(CREATED_BY_PIECE, secondUser.username);
      Receivings.assertReceivingResults([secondTitle]);

      // Step 8: Click "x" icon next to "Created by (Piece)" filter
      Receivings.clearFilter(CREATED_BY_PIECE);
      Receivings.verifyUserFilterSelected(CREATED_BY_PIECE, '');
      Receivings.verifyChooseFilterMessage();
    },
  );
});
