import {
  ACQUISITION_METHOD_NAMES,
  CHANGE_INSTANCE_HOLDINGS_OPERATIONS,
  ITEM_STATUS_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { InventoryInstance, InventoryInstances } from '../../../support/fragments/inventory';
import {
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import ChangeInstanceModal from '../../../support/fragments/orders/modals/changeInstanceModal';
import DeleteHoldingsModal from '../../../support/fragments/orders/modals/deleteHoldingsModal';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import SelectLocationModal from '../../../support/fragments/orders/modals/selectLocationModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../../support/fragments/receiving';
import EditPieceModal from '../../../support/fragments/receiving/modals/editPieceModal';
import { Locations } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {};

    before('Create test data', () => {
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C358535_Organization_${getRandomPostfix()}`,
      };

      cy.clearLocalStorage();
      cy.getAdminToken();
      Locations.getViaApiAnyDefault(3).then((locations) => {
        [testData.firstLocation, testData.secondLocation, testData.thirdLocation] = locations;
      });
      // Title #1
      InventoryInstance.createInstanceViaApi({
        instanceTitle: `AT_C358535_FolioInstance_first_${getRandomPostfix()}`,
      }).then(({ instanceData }) => {
        testData.firstInstance = instanceData;
      });
      // Title #2
      InventoryInstance.createInstanceViaApi({
        instanceTitle: `AT_C358535_FolioInstance_second_${getRandomPostfix()}`,
      }).then(({ instanceData }) => {
        testData.secondInstance = instanceData;
      });
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          testData.order = order;
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.inventoryCRUDHoldings.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.firstInstance.instanceId,
      );
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.secondInstance.instanceId,
      );
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C358535 Item appears under holdings after instance connection change with holding setting "Find or create" (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C358535'] },
      () => {
        // Step 1: Click on the order from Preconditions #4
        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

        // Step 2: Click "Actions" button in "PO lines" accordion and select "Add PO line" option
        OrderDetails.selectAddPOLine();

        // Steps 3-5: Click "Title look-up" link, search for Title #1 and click on it
        OrderLineEditForm.fillItemDetailsTitle({
          instanceTitle: testData.firstInstance.instanceTitle,
        });
        OrderLineEditForm.checkItemDetailsSection([
          { label: 'title', conditions: { value: testData.firstInstance.instanceTitle } },
        ]);

        // Step 6: Choose Acquisition method, Order format and "Independent order and receipt quantity" workflow
        OrderLineEditForm.fillPoLineDetails({
          acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE,
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          receivingWorkflow: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
        });

        // Step 7: Specify unit price and quantity "2" in "Cost details" accordion
        OrderLineEditForm.fillCostDetails({ physicalUnitPrice: '10', quantityPhysical: '2' });

        // Step 8: Click "Create new holdings for location" link in "Location" accordion
        OrderLineEditForm.clickAddLocationButton();
        OrderLineEditForm.clickCreateNewHoldingsButton();

        // Step 9: Choose location and click "Save & close" button
        SelectLocationModal.selectLocation(testData.firstLocation.name);

        // Step 10: Specify quantity for chosen order format as "1"
        OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1' }]);

        // Step 11: Click "Add location" button
        OrderLineEditForm.clickAddLocationButton();

        // Step 12: Click "Create new holdings for location" link
        OrderLineEditForm.clickCreateNewHoldingsButton({ index: 1 });

        // Step 13: Choose location different from step 9 and click "Save & close" button
        SelectLocationModal.selectLocation(testData.secondLocation.name);

        // Step 14: Specify quantity for chosen order format as "1"
        OrderLineEditForm.fillLocationDetails([{}, { quantityPhysical: '1' }]);

        // Step 15: Fill mandatory fields and specify "Create inventory" as "Instance, holdings, item"
        OrderLineEditForm.fillPoLineDetails({
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          createInventory: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
        });

        // Step 16: Click "Save & close" button
        OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
        OrderLineDetails.waitLoading();

        // Step 17: Click back arrow on "PO Line details" pane
        OrderLineDetails.backToOrderDetails();

        // Steps 18-19: Click "Actions" button, select "Open" option and click "Submit" button
        OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Step 20: Click "Actions" on PO line details pane, select "Receive" and click on Receiving title
        OrderDetails.openPolDetails(testData.firstInstance.instanceTitle);
        OrderLines.receiveOrderLineViaActions();
        Receivings.selectFromResultsList(testData.firstInstance.instanceTitle);
        ReceivingDetails.checkTitlePaneIsDisplayed(testData.firstInstance.instanceTitle);

        // Step 21: Click "Actions" button in "Expected" accordion and select "Add piece" option
        Receivings.addPieceInActions();
        EditPieceModal.waitLoading();

        // Step 22: Fill receipt date, choose holding from step 9, check "Create item", select "Quick receive"
        EditPieceModal.fillPieceDetails({
          [RECEIVING_PIECE_FORM_FIELD_LABELS.EXPECTED_RECEIPT_DATE]: DateTools.getCurrentDate(),
        });
        EditPieceModal.selectHolding(testData.firstLocation.name);
        EditPieceModal.checkCreateItemCheckbox();
        Receivings.quickReceiveInEditPieceModal();

        // Step 23: Click "Actions" button in "Expected" accordion and select "Add piece" option
        Receivings.addPieceInActions();
        EditPieceModal.waitLoading();

        // Step 24: Click "Create new holdings for location" link
        EditPieceModal.clickCreateNewholdingsForLocation();

        // Step 25: Choose location different from steps 9 and 13 and click "Save & close" button
        SelectLocationModal.selectLocation(testData.thirdLocation.name);
        EditPieceModal.verifySelectedLocation(testData.thirdLocation.name);

        // Step 26: Fill receipt date, check "Create item" and select "Quick receive"
        EditPieceModal.fillPieceDetails({
          [RECEIVING_PIECE_FORM_FIELD_LABELS.EXPECTED_RECEIPT_DATE]: DateTools.getCurrentDate(),
        });
        EditPieceModal.checkCreateItemCheckbox();
        Receivings.quickReceiveInEditPieceModal();

        // Step 27: Click on "PO line" link in "POL details" accordion
        ReceivingDetails.openOrderLineDetails();

        // Step 28: Click "Actions" button and select "Change instance connection" option
        OrderLineDetails.changeInstanceConnection();

        // Step 29: Search for Title #2 and click on it
        SelectInstanceModal.searchByName(testData.secondInstance.instanceTitle);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });

        // Step 30: Select "Find or create" in "How to update Holdings" dropdown and click "Submit" button
        ChangeInstanceModal.selectHoldingOperation({
          operation: CHANGE_INSTANCE_HOLDINGS_OPERATIONS.FIND_OR_CREATE_NEW,
          shouldConfirm: false,
        });
        ChangeInstanceModal.clickSubmitButton({ updated: false });
        DeleteHoldingsModal.verifyModalView();

        // Step 31: Click "Keep Holdings" button
        DeleteHoldingsModal.clickKeepHoldingsButton();
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [
            { key: POLINE_DETAILS_FIELDS.TITLE, value: testData.secondInstance.instanceTitle },
          ],
        });

        // Step 32: Click on "Title #2" link in "Item details" accordion
        OrderLineDetails.openInventoryItem();
        InventoryInstance.checkInstanceTitle(testData.secondInstance.instanceTitle);
        InventoryInstance.checkHoldingTitle({ title: testData.firstLocation.name });
        InventoryInstance.checkHoldingTitle({ title: testData.secondLocation.name });
        InventoryInstance.checkHoldingTitle({ title: testData.thirdLocation.name });
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.secondLocation.name, 0);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.firstLocation.name,
          records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
        });
        InventoryInstance.checkHoldingsTableContent({
          name: testData.thirdLocation.name,
          records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
        });

        // Step 33: Search for "Title #1" and click on it
        InventoryInstances.searchByTitle(testData.firstInstance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(testData.firstInstance.instanceTitle);
        InventoryInstance.checkHoldingTitle({ title: testData.firstLocation.name });
        InventoryInstance.checkHoldingTitle({ title: testData.secondLocation.name });
        InventoryInstance.checkHoldingTitle({ title: testData.thirdLocation.name });
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.firstLocation.name, 0);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.secondLocation.name, 0);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.thirdLocation.name, 0);
      },
    );
  });
});
