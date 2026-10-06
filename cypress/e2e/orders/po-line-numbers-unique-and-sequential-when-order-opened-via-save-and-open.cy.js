import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import OrderStates from '../../support/fragments/orders/orderStates';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import OpenOrder from '../../support/fragments/settings/orders/openOrder';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const poLinesLimit = 5;
  const initialPoLinesLimit = 1;
  const quantity = '1';
  let testData;

  const getPoLineTitle = () => `AT_C1346388_POLine_${getRandomPostfix()}`;

  const fillPoLineFields = () => {
    const title = getPoLineTitle();

    testData.poLineTitles.push(title);
    OrderLineEditForm.fillOrderLineFields({
      itemDetails: { title },
      poLineDetails: {
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
        orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
        materialType: testData.materialType.name,
      },
      costDetails: {
        physicalUnitPrice: '10',
        quantityPhysical: quantity,
      },
    });
    OrderLineEditForm.clickAddLocationButton();
    OrderLineEditForm.expandLocationDropdown(0);
    OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
    OrderLineEditForm.fillLocationDetails([{ quantityPhysical: quantity }]);

    OrderLineEditForm.checkItemDetailsSection([{ label: 'title', conditions: { value: title } }]);
    OrderLineEditForm.checkOrderLineDetailsSection([
      {
        label: 'checkinItems',
        conditions: {
          checkedOptionText: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
        },
      },
    ]);
    OrderLineEditForm.checkPhysicalResourceDetailsSection([
      {
        label: 'createInventory',
        conditions: { checkedOptionText: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM },
      },
    ]);
  };

  // Unique aliases per step: previously registered intercepts keep matching requests,
  // so reusing an alias would yield a stale, not yet waited-on request from earlier steps
  const interceptSaveAndOpenRequests = (step) => {
    cy.intercept('POST', '**/orders/order-lines').as(`createPoLine_${step}`);
    cy.intercept('GET', `**/orders/composite-orders/${testData.order.id}*`).as(`getOrder_${step}`);
    cy.intercept('PUT', `**/orders/composite-orders/${testData.order.id}`).as(
      `updateOrder_${step}`,
    );
  };

  const verifySaveAndOpenRequests = (step, expectedNextPolNumber) => {
    cy.wait(`@createPoLine_${step}`).its('response.statusCode').should('eq', 201);
    cy.wait(`@getOrder_${step}`)
      .its('response.body.nextPolNumber')
      .should('eq', expectedNextPolNumber);
    cy.wait(`@updateOrder_${step}`)
      .its('request.body.nextPolNumber')
      .should('eq', expectedNextPolNumber);
  };

  const verifyPoLinesInOrder = (poLineNumbers) => {
    OrderDetails.verifyOrderTitle(`Purchase order - ${testData.order.poNumber}`);
    OrderDetails.verifyPOLCount(poLineNumbers.length);
    poLineNumbers.forEach((poLineNumber) => {
      OrderDetails.checkOrderLineInTableByIdentifier(poLineNumber);
    });
  };

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      poLineTitles: [getPoLineTitle()],
      order: {},
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken().then(() => {
      // Precondition #1: "Set purchase order lines limit" is set to more than 3
      OrderLinesLimit.setPOLLimitViaApi(poLinesLimit);
      // Precondition #2: "Allow save and open purchase order when creating or editing a purchase order line" is active
      OpenOrder.setOpenOrderValue(true);

      MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
        testData.materialType = mtypes[0];
      });
      Locations.getViaApiAnyDefault().then(([location]) => {
        testData.location = location;
      });
      cy.getAcquisitionMethodsApi().then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });

      // Precondition #3: Pending order with one PO line (Synchronized, Instance, holdings, item)
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        Orders.createOrderViaApi({
          ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          approved: true,
        }).then((order) => {
          testData.order = order;

          OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.getDefaultOrderLine({
              title: testData.poLineTitles[0],
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethod.id,
              checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
              quantity: Number(quantity),
            }),
            orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: testData.materialType.id,
              materialSupplier: testData.organization.id,
              volumes: [],
            },
            locations: [
              {
                locationId: testData.location.id,
                quantity: Number(quantity),
                quantityPhysical: Number(quantity),
              },
            ],
          });
        });
      });
    });

    // Precondition #4: User with required capabilities is logged in
    cy.createTempUser([
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });

      // Precondition #5: User is on "Orders" pane with the details open for the Order
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    OpenOrder.setOpenOrderValue(false);
    OrderLinesLimit.setPOLLimitViaApi(initialPoLinesLimit);
    Orders.deleteOrderViaApi(testData.order.id, false);
    testData.poLineTitles.forEach((title) => {
      InventoryInstances.deleteFullInstancesByTitleViaApi(title);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1346388 PO line numbers remain unique and increase sequentially when an order is opened via Save & Open (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1346388', 'nonParallel'] },
    () => {
      const poNumber = testData.order.poNumber;
      const [firstPoLineNumber, secondPoLineNumber, thirdPoLineNumber, fourthPoLineNumber] = [
        1, 2, 3, 4,
      ].map((index) => `${poNumber}-${index}`);

      // Step 1: Click "Actions" button in the "PO lines" accordion => select "Add PO line" option
      OrderDetails.selectAddPOLine();

      // Step 2: Fill in all mandatory fields
      fillPoLineFields();

      // Step 3: Click "Save & open order" button
      interceptSaveAndOpenRequests(3);
      OrderLineEditForm.clickSaveAndOpenOrderButton();
      verifySaveAndOpenRequests(3, 3);
      OrderLineDetails.waitLoading();
      OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${secondPoLineNumber}`);

      // Step 4: Click back arrow => "Actions" => "Unopen" => "Delete Holdings and items"
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.unOpenOrder({
        orderNumber: poNumber,
        checkinItems: false,
        hasRelations: true,
      });
      InteractorsTools.checkCalloutMessage(OrderStates.orderUnopenedSuccessfully(poNumber));
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      verifyPoLinesInOrder([firstPoLineNumber, secondPoLineNumber]);

      // Step 5: Click "Actions" button in the "PO lines" accordion => select "Add PO line" option
      OrderDetails.selectAddPOLine();

      // Step 6: Fill in all mandatory fields
      fillPoLineFields();

      // Step 7: Click "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineEditForm.verifyOrderLineEditFormClosed();
      OrderLineDetails.waitLoading();
      OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${thirdPoLineNumber}`);

      // Step 8: Click back arrow on the "PO Line details" pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      verifyPoLinesInOrder([firstPoLineNumber, secondPoLineNumber, thirdPoLineNumber]);

      // Step 9: Click "Actions" button in the "PO lines" accordion => select "Add PO line" option
      OrderDetails.selectAddPOLine();

      // Step 10: Fill in all mandatory fields
      fillPoLineFields();

      // Step 11: Click "Save & open order" button
      interceptSaveAndOpenRequests(11);
      OrderLineEditForm.clickSaveAndOpenOrderButton();
      verifySaveAndOpenRequests(11, 5);
      OrderLineDetails.waitLoading();
      OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${fourthPoLineNumber}`);

      // Step 12: Click back arrow on the "PO Line details" pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      verifyPoLinesInOrder([
        firstPoLineNumber,
        secondPoLineNumber,
        thirdPoLineNumber,
        fourthPoLineNumber,
      ]);
    },
  );
});
