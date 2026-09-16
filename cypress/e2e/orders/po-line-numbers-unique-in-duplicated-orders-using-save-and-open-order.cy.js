import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import OpenConfirmationModal from '../../support/fragments/orders/modals/openConfirmationModal';
import OrderStates from '../../support/fragments/orders/orderStates';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { PrefixSuffix } from '../../support/fragments/settings/orders/newPrefixSuffix';
import OpenOrder from '../../support/fragments/settings/orders/openOrder';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import SettingsOrders from '../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix, { randomFourDigitNumber } from '../../support/utils/stringTools';

describe('Orders', () => {
  const orderDuplicatedMessage = 'The purchase order was successfully duplicated';
  const poLinesLimit = 5;
  const initialPoLinesLimit = 1;
  let testData;

  const getPoLineData = () => ({
    itemDetails: { title: `AT_C400672_POLine_${getRandomPostfix()}` },
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
      orderFormat: ORDER_FORMAT_NAMES.OTHER,
    },
    costDetails: {
      physicalUnitPrice: '10',
      quantityPhysical: '1',
    },
  });

  const getOrderOpenedMessage = (poNumber) => {
    return `The Purchase order - ${poNumber} has been successfully opened`;
  };
  const getOrderLineDeletedMessage = (poLineNumber) => {
    return `The purchase order line ${poLineNumber} was successfully deleted`;
  };

  const getNewDuplicatedOrder = (knownOrderIds) => {
    cy.getAdminToken(false).then(() => {
      Orders.getOrdersApi({ query: `vendor==${testData.organization.id}` }).then((orders) => {
        const duplicatedOrder = orders.find(({ id }) => !knownOrderIds.includes(id));

        testData.duplicatedOrders.push(duplicatedOrder);
      });
    });
    cy.getUserToken(testData.user.username, testData.user.password);
  };

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
    OrderLines.deleteOrderLine({ poLineNumber });
    InteractorsTools.checkCalloutMessage(getOrderLineDeletedMessage(poLineNumber));
    OrderDetails.waitLoading();
  };

  const verifyDuplicatedOrder = (duplicatedOrder, poLineNumbers) => {
    OrderDetails.verifyOrderTitle(`Purchase order - ${duplicatedOrder.poNumber}`);
    Orders.checkOrderNumberContainsPrefixSuffix(testData.prefix.name, testData.suffix.name);
    OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
    OrderDetails.verifyPOLCount(poLineNumbers.length);
    poLineNumbers.forEach((poLineNumber) => {
      OrderDetails.checkOrderLineInTableByIdentifier(poLineNumber);
    });
  };

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      prefix: { ...PrefixSuffix.defaultPrefix },
      suffix: { ...PrefixSuffix.defaultSuffix },
      order: {},
      duplicatedOrders: [],
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken().then(() => {
      OrderLinesLimit.setPOLLimitViaApi(poLinesLimit);
      OpenOrder.setOpenOrderValue(true);

      SettingsOrders.createPrefixViaApi(testData.prefix.name).then((prefixId) => {
        testData.prefix.id = prefixId;
      });
      SettingsOrders.createSuffixViaApi(testData.suffix.name).then((suffixId) => {
        testData.suffix.id = suffixId;
      });

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        Orders.createOrderViaApi({
          ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          poNumberPrefix: testData.prefix.name,
          poNumberSuffix: testData.suffix.name,
          poNumber: `${testData.prefix.name}${randomFourDigitNumber()}${testData.suffix.name}`,
          approved: true,
        }).then((order) => {
          testData.order = order;
        });
      });
    });

    cy.createTempUser([
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersDelete.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });

      // Precondition #5: add PO line to the order and open it via "Save & open order" button
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.fillOrderLineFields(getPoLineData());
      OrderLineEditForm.clickSaveAndOpenOrderButton({ orderOpened: false });
      InteractorsTools.checkCalloutMessage(getOrderOpenedMessage(testData.order.poNumber));
      OrderLineDetails.backToOrderDetails();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      Orders.resetFiltersIfActive();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      OpenOrder.setOpenOrderValue(false);
      OrderLinesLimit.setPOLLimitViaApi(initialPoLinesLimit);
      testData.duplicatedOrders.forEach(({ id }) => {
        Orders.deleteOrderViaApi(id, false);
      });
      Orders.deleteOrderViaApi(testData.order.id, false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      SettingsOrders.deletePrefixViaApi(testData.prefix.id);
      SettingsOrders.deleteSuffixViaApi(testData.suffix.id);

      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C400672 PO line numbers should be unique in duplicated orders when using "Save & open order" button (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C400672', 'nonParallel'] },
    () => {
      // Step 1: Open Order from Preconditions details pane
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.verifyOrderTitle(`Purchase order - ${testData.order.poNumber}`);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click "Actions" button on "Purchase order - <number>" pane => select "Duplicate" option
      // Step 3: Click "Duplicate" button in "Duplicate order?" modal
      Orders.duplicateOrder({ verifyModal: true });
      InteractorsTools.checkCalloutMessage(orderDuplicatedMessage);
      OrderDetails.waitLoading();
      getNewDuplicatedOrder([testData.order.id]);

      cy.then(() => {
        const [firstDuplicatedOrder] = testData.duplicatedOrders;
        const firstOrderPoNumber = firstDuplicatedOrder.poNumber;

        verifyDuplicatedOrder(firstDuplicatedOrder, [`${firstOrderPoNumber}-1`]);

        // Step 4: Click "Actions" button in "PO lines" accordion -> select "Add PO line" option
        // Step 5: Fill all mandatory fields => Click "Save & close" button in "Add PO line" page
        addPoLine(`${firstOrderPoNumber}-2`);

        // Step 6: Click "Back" arrow on the left top of the "PO Line details" pane
        OrderLineDetails.backToOrderDetails();
        OrderDetails.waitLoading();
        OrderDetails.verifyPOLCount(2);
        OrderDetails.checkOrderLineInTableByIdentifier(`${firstOrderPoNumber}-1`);
        OrderDetails.checkOrderLineInTableByIdentifier(`${firstOrderPoNumber}-2`);

        // Step 7: Click PO line record created in Step #5 in "PO lines" accordion
        // Step 8: Click "Actions" button on "PO Line details" pane => select "Delete" option
        // Step 9: Click "Delete" button
        deletePoLine(`${firstOrderPoNumber}-2`);
        OrderDetails.verifyOrderTitle(`Purchase order - ${firstOrderPoNumber}`);
        OrderDetails.verifyPOLCount(1);
        OrderDetails.checkOrderLineInTableByIdentifier(`${firstOrderPoNumber}-1`);

        // Step 10: Click "Actions" button in "PO lines" accordion -> select "Add PO line" option
        // Step 11: Fill all mandatory fields => Click "Save & close" button in "Add PO line" page
        addPoLine(`${firstOrderPoNumber}-3`);

        // Step 12: Open duplicated Order: Click "Back" arrow => "Actions" => "Open" => "Submit"
        OrderLineDetails.backToOrderDetails();
        OrderDetails.waitLoading();
        OrderDetails.openOrder({ orderNumber: firstOrderPoNumber, confirm: false });
        OpenConfirmationModal.confirm(false);
        InteractorsTools.checkCalloutMessage(getOrderOpenedMessage(firstOrderPoNumber));
        OrderDetails.verifyOrderTitle(`Purchase order - ${firstOrderPoNumber}`);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Step 13: Click "Actions" button on "Purchase order - <number>" pane => select "Unopen" option
        // Step 14: Confirm unopen in "Unopen - purchase order - <number>" modal
        OrderDetails.unOpenOrder({
          orderNumber: firstOrderPoNumber,
          hasRelations: false,
          submit: true,
        });
        InteractorsTools.checkCalloutMessage(
          OrderStates.orderUnopenedSuccessfully(firstOrderPoNumber),
        );
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

        // Step 15: Click "Actions" button on "Purchase order - <number>" pane => select "Duplicate" option
        // Step 16: Click "Duplicate" button in "Duplicate order?" modal
        Orders.duplicateOrder({ verifyModal: true });
        InteractorsTools.checkCalloutMessage(orderDuplicatedMessage);
        OrderDetails.waitLoading();
        getNewDuplicatedOrder([testData.order.id, firstDuplicatedOrder.id]);
      });

      cy.then(() => {
        const secondDuplicatedOrder = testData.duplicatedOrders[1];
        const secondOrderPoNumber = secondDuplicatedOrder.poNumber;

        verifyDuplicatedOrder(secondDuplicatedOrder, [
          `${secondOrderPoNumber}-1`,
          `${secondOrderPoNumber}-2`,
        ]);

        // Step 17: Click "Actions" button in "PO lines" accordion -> select "Add PO line" option
        // Step 18: Fill all mandatory fields => Click "Save & close" button in "Add PO line" page
        addPoLine(`${secondOrderPoNumber}-3`);

        // Step 19: Click "Back" arrow on the left top of the "PO Line details" pane
        OrderLineDetails.backToOrderDetails();
        OrderDetails.waitLoading();
        OrderDetails.verifyPOLCount(3);
        OrderDetails.checkOrderLineInTableByIdentifier(`${secondOrderPoNumber}-1`);
        OrderDetails.checkOrderLineInTableByIdentifier(`${secondOrderPoNumber}-2`);
        OrderDetails.checkOrderLineInTableByIdentifier(`${secondOrderPoNumber}-3`);

        // Step 20: Click PO line record created in Step #18 in "PO lines" accordion
        // Step 21: Click "Actions" button on "PO Line details" pane => select "Delete" option => Click "Delete" button
        deletePoLine(`${secondOrderPoNumber}-3`);
        OrderDetails.verifyOrderTitle(`Purchase order - ${secondOrderPoNumber}`);
        OrderDetails.verifyPOLCount(2);
        OrderDetails.checkOrderLineInTableByIdentifier(`${secondOrderPoNumber}-1`);
        OrderDetails.checkOrderLineInTableByIdentifier(`${secondOrderPoNumber}-2`);

        // Step 22: Click "Actions" button in "PO lines" accordion -> select "Add PO line" option
        // Step 23: Fill all mandatory fields => Click "Save & close" button in "Add PO line" page
        addPoLine(`${secondOrderPoNumber}-4`);
      });
    },
  );
});
