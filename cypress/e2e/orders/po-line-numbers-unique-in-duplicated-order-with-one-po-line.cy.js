import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const orderDuplicatedMessage = 'The purchase order was successfully duplicated';
  let testData;

  const getPoLineData = () => ({
    itemDetails: { title: `AT_C397987_POLine_${getRandomPostfix()}` },
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
      orderFormat: ORDER_FORMAT_NAMES.OTHER,
    },
    costDetails: {
      physicalUnitPrice: '10',
      quantityPhysical: '1',
    },
  });

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      duplicatedOrder: {},
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken().then(() => {
      OrderLinesLimit.setPOLLimitViaApi(4);
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

        Orders.createOrderWithOrderLineViaApi(
          testData.order,
          BasicOrderLine.getDefaultOrderLine(),
        ).then((order) => {
          testData.order = order;
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrdersDelete.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      OrderLinesLimit.setPOLLimitViaApi(1);
      if (testData.duplicatedOrder.id) {
        Orders.deleteOrderViaApi(testData.duplicatedOrder.id, false);
      }
      Orders.deleteOrderViaApi(testData.order.id, false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C397987 PO line numbers should be unique in duplicated orders when initial order has one PO line (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C397987', 'nonParallel'] },
    () => {
      // Step 1: Open Order from Preconditions #2 details pane
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.verifyOrderTitle(`Purchase order - ${testData.order.poNumber}`);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Click "Actions" button on "Purchase order - <number>" pane => select "Duplicate" option
      // Step 3: Click "Duplicate" button
      Orders.duplicateOrder({ verifyModal: true });
      InteractorsTools.checkCalloutMessage(orderDuplicatedMessage);
      OrderDetails.waitLoading();

      cy.getAdminToken(false).then(() => {
        Orders.getOrdersApi({ query: `vendor==${testData.organization.id}` }).then((orders) => {
          testData.duplicatedOrder = orders.find(({ id }) => id !== testData.order.id);
        });
      });
      cy.getUserToken(testData.user.username, testData.user.password);

      cy.then(() => {
        const duplicatedPoNumber = testData.duplicatedOrder.poNumber;
        const firstPoLineNumber = `${duplicatedPoNumber}-1`;
        const secondPoLineNumber = `${duplicatedPoNumber}-2`;
        const thirdPoLineNumber = `${duplicatedPoNumber}-3`;

        OrderDetails.verifyOrderTitle(`Purchase order - ${duplicatedPoNumber}`);
        OrderDetails.verifyPOLCount(1);
        OrderDetails.checkOrderLineInTableByIdentifier(firstPoLineNumber);

        // Step 4: Click "Actions" button in "PO lines" accordion -> select "Add PO line" option
        OrderDetails.selectAddPOLine();

        // Step 5: Fill all mandatory fields => Click "Save & close" button in "Add PO line" page
        OrderLineEditForm.fillOrderLineFields(getPoLineData());
        OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
        OrderLineEditForm.verifyOrderLineEditFormClosed();
        OrderLineDetails.waitLoading();
        OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${secondPoLineNumber}`);

        // Step 6: Click "Back" arrow on the left top of the "PO Line details" pane
        OrderLineDetails.backToOrderDetails();
        OrderDetails.waitLoading();
        OrderDetails.verifyPOLCount(2);
        OrderDetails.checkOrderLineInTableByIdentifier(firstPoLineNumber);
        OrderDetails.checkOrderLineInTableByIdentifier(secondPoLineNumber);

        // Step 7: Click on PO line "PO number - X+1" record created in Step #5
        OrderDetails.openPolDetails(secondPoLineNumber);
        OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${secondPoLineNumber}`);

        // Step 8: Click "Actions" button on "PO Line details" pane => select "Delete" option
        // Step 9: Click "Delete" button
        OrderLines.deleteOrderLine({
          poLineNumber: secondPoLineNumber,
          checkDeleteSuccessMessage: true,
        });
        OrderDetails.waitLoading();
        OrderDetails.verifyOrderTitle(`Purchase order - ${duplicatedPoNumber}`);
        OrderDetails.verifyPOLCount(1);
        OrderDetails.checkOrderLineInTableByIdentifier(firstPoLineNumber);

        // Step 10: Click "Actions" button in "PO lines" accordion -> select "Add PO line" option
        OrderDetails.selectAddPOLine();

        // Step 11: Fill all mandatory fields => Click "Save & close" button in "Add PO line" page
        OrderLineEditForm.fillOrderLineFields(getPoLineData());
        OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
        OrderLineEditForm.verifyOrderLineEditFormClosed();
        OrderLineDetails.waitLoading();
        OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${thirdPoLineNumber}`);
      });
    },
  );
});
