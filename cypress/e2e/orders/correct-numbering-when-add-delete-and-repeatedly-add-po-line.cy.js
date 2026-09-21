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
  OrderEditForm,
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
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const poLinesLimit = 5;
  const initialPoLinesLimit = 1;
  let testData;

  const getPoLineData = () => ({
    itemDetails: { title: `AT_C380584_POLine_${getRandomPostfix()}` },
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
      orderFormat: ORDER_FORMAT_NAMES.OTHER,
    },
    costDetails: {
      physicalUnitPrice: '10',
      quantityPhysical: '1',
    },
  });

  const addPoLine = (expectedPoLineNumber) => {
    OrderDetails.selectAddPOLine();
    OrderLineEditForm.fillOrderLineFields(getPoLineData());
    OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
    OrderLineEditForm.verifyOrderLineEditFormClosed();
    OrderLineDetails.waitLoading();
    OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${expectedPoLineNumber}`);
  };

  const deletePoLine = (poLineNumber) => {
    OrderDetails.openPolDetails(poLineNumber);
    OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${poLineNumber}`);
    OrderLines.deleteOrderLine({ poLineNumber, checkDeleteSuccessMessage: true });
    OrderDetails.waitLoading();
  };

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      secondOrganization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken().then(() => {
      // Precondition #1: set PO line limit to "5"
      OrderLinesLimit.setPOLLimitViaApi(poLinesLimit);

      Organizations.createOrganizationViaApi(testData.secondOrganization);
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        // Precondition #2: create order in "Pending" status with one PO line
        Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          testData.order = order;

          cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then(({ body }) => {
            OrderLines.createOrderLineViaApi(
              BasicOrderLine.getDefaultOrderLine({
                acquisitionMethod: body.acquisitionMethods[0].id,
                purchaseOrderId: order.id,
              }),
            );
          });
        });
      });
    });

    // Precondition #3: create user with required permissions
    cy.createTempUser([
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersDelete.gui,
      Permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition #4: log in and open "Orders" pane
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id, false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Organizations.deleteOrganizationViaApi(testData.secondOrganization.id);
      OrderLinesLimit.setPOLLimitViaApi(initialPoLinesLimit);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C380584 Correct numbering when add, delete, and repeatedly add PO line (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C380584', 'nonParallel'] },
    () => {
      const poNumber = testData.order.poNumber;
      const firstPoLineNumber = `${poNumber}-1`;
      const secondPoLineNumber = `${poNumber}-2`;
      const thirdPoLineNumber = `${poNumber}-3`;
      const fourthPoLineNumber = `${poNumber}-4`;

      // Step 1: Click on PO number link for order from Preconditions #2 on "Orders" pane
      Orders.selectOrderByPONumber(poNumber);
      OrderDetails.verifyOrderTitle(`Purchase order - ${poNumber}`);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.verifyPOLCount(1);
      OrderDetails.checkOrderLineInTableByIdentifier(firstPoLineNumber);

      // Step 2: Click "Actions" button in "PO lines" accordion -> select "Add PO line" option
      // Step 3: Fill all mandatory fields with any values
      // Step 4: Click "Save & close" button
      addPoLine(secondPoLineNumber);

      // Step 5: Click "Back" arrow on the left top of the "PO Line details" pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.verifyPOLCount(2);
      OrderDetails.checkOrderLineInTableByIdentifier(firstPoLineNumber);
      OrderDetails.checkOrderLineInTableByIdentifier(secondPoLineNumber);

      // Step 6: Click on PO line record created in Step #3 in "PO lines" accordion
      // Step 7: Click "Actions" button on "PO Line details" pane -> select "Delete" option
      // Step 8: Click "Delete" button
      deletePoLine(secondPoLineNumber);
      OrderDetails.verifyOrderTitle(`Purchase order - ${poNumber}`);
      OrderDetails.verifyPOLCount(1);
      OrderDetails.checkOrderLineInTableByIdentifier(firstPoLineNumber);

      // Step 9: Click "Actions" button in "PO lines" accordion -> select "Add PO line" option
      // Step 10: Fill all mandatory fields with any values
      // Step 11: Click "Save & close" button
      addPoLine(thirdPoLineNumber);

      // Step 12: Click "Back" arrow on the left top of the "PO Line details" pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.verifyPOLCount(2);
      OrderDetails.checkOrderLineInTableByIdentifier(firstPoLineNumber);
      OrderDetails.checkOrderLineInTableByIdentifier(thirdPoLineNumber);

      // Step 13: Open PO line created in Step #11 -> "Actions" -> "Delete" -> click "Delete" button
      deletePoLine(thirdPoLineNumber);

      // Step 14: Click "Actions" -> "Edit" -> edit any field -> click "Save & close" button
      OrderDetails.openOrderEditForm();
      OrderEditForm.fillOrderInfoSectionFields({
        organizationName: testData.secondOrganization.name,
      });
      OrderEditForm.clickSaveButton({ orderSaved: true });
      OrderDetails.waitLoading();
      OrderDetails.verifyOrderTitle(`Purchase order - ${poNumber}`);
      OrderDetails.verifyPOLCount(1);
      OrderDetails.checkOrderLineInTableByIdentifier(firstPoLineNumber);

      // Step 15: Click "Actions" in "PO lines" accordion -> "Add PO line" -> fill fields -> "Save & close"
      addPoLine(fourthPoLineNumber);

      // Step 16: Click "Back" arrow on the left top of the "PO Line details" pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.verifyPOLCount(2);
      OrderDetails.checkOrderLineInTableByIdentifier(firstPoLineNumber);
      OrderDetails.checkOrderLineInTableByIdentifier(fourthPoLineNumber);
    },
  );
});
