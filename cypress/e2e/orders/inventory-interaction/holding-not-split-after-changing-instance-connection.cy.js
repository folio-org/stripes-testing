import {
  CHANGE_INSTANCE_HOLDINGS_OPERATIONS,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import AcqVersionHistory from '../../../support/fragments/acqVersionHistory';
import { InventoryInstance, InventoryInstances } from '../../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../../support/fragments/orders/basicOrderLine';
import ChangeInstanceModal from '../../../support/fragments/orders/modals/changeInstanceModal';
import DeleteHoldingsModal from '../../../support/fragments/orders/modals/deleteHoldingsModal';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../../support/fragments/receiving';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import { Locations } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const entityType = 'order-line';
    const quantity = 65;
    // versions created in preconditions: original version and opening the order
    const initialVersionsCount = 2;
    // fields listed as "Changed" on the card created by changing instance connection
    const instanceChangedFields = [
      POLINE_DETAILS_FIELDS.HOLDING_NAME,
      POLINE_DETAILS_FIELDS.INSTANCE_ID,
      POLINE_DETAILS_FIELDS.PRODUCT_ID,
      POLINE_DETAILS_FIELDS.PRODUCT_ID_TYPE,
      POLINE_DETAILS_FIELDS.PUBLICATION_DATE,
      POLINE_DETAILS_FIELDS.PUBLISHER,
      POLINE_DETAILS_FIELDS.TITLE,
    ];
    // fields listed as "Changed" on the card created by moving items within an instance
    const itemsMoveChangedFields = [
      POLINE_DETAILS_FIELDS.HOLDING_NAME,
      POLINE_DETAILS_FIELDS.QUANTITY,
      POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL,
    ];
    const testData = {};

    // every instance connection change adds exactly one card, every moved item adds its own card,
    // so "versionsCount" is the exact number of cards expected after the action
    const checkVersionHistory = ({ versionsCount, changedFields, highlightedValues }) => {
      OrderLineDetails.openVersionHistory();
      AcqVersionHistory.verifyVersionsCount(entityType, versionsCount);
      AcqVersionHistory.assertVersionHistoryCard(entityType, {
        index: 0,
        isCurrent: true,
        changedFields,
      });
      OrderLineDetails.checkHighlightedFieldsInVersionHistoryView(highlightedValues);
      AcqVersionHistory.closeVersionHistory(entityType);
    };
    // values highlighted in version view after changing instance connection to the "instance"
    const getInstanceChangedValues = (instance) => [
      testData.orderLineLocation.name,
      instance.productId,
      instance.productIdType.name,
      instance.dateOfPublication,
      instance.publisher,
      instance.title,
    ];

    before('Create test data', () => {
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C839100_Organization_${getRandomPostfix()}`,
      };
      testData.orderLineInstanceTitle = `AT_C839100_FolioInstance_order_${getRandomPostfix()}`;

      cy.clearLocalStorage();
      cy.getAdminToken();
      MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
        testData.materialType = mtypes[0];
      });
      cy.getAcquisitionMethodsApi().then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });
      cy.getProductIdTypes({ query: 'name=="ISBN"' }).then((productIdType) => {
        testData.isbnType = productIdType;
      });
      cy.getProductIdTypes({ query: 'name=="ISSN"' }).then((productIdType) => {
        testData.issnType = productIdType;
      });
      Locations.getViaApiAnyDefault(2).then((locations) => {
        [testData.orderLineLocation, testData.holdingLocation] = locations;
      });
      Organizations.createOrganizationViaApi(testData.organization);

      cy.then(() => {
        // Instance #1 without holdings, Instance #2 with one holding;
        // product IDs and publication differ from each other and from the order title
        testData.firstInstance = {
          title: `AT_C839100_FolioInstance_first_${getRandomPostfix()}`,
          productId: `${getRandomPostfix()}1`,
          productIdType: testData.isbnType,
          publisher: `AT_C839100_Publisher_first_${getRandomPostfix()}`,
          dateOfPublication: '2001',
        };
        testData.secondInstance = {
          title: `AT_C839100_FolioInstance_second_${getRandomPostfix()}`,
          productId: `${getRandomPostfix()}2`,
          productIdType: testData.issnType,
          publisher: `AT_C839100_Publisher_second_${getRandomPostfix()}`,
          dateOfPublication: '2002',
        };

        [testData.firstInstance, testData.secondInstance].forEach((instance, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: instance.title,
              identifiers: [
                { identifierTypeId: instance.productIdType.id, value: instance.productId },
              ],
              publication: [
                { publisher: instance.publisher, dateOfPublication: instance.dateOfPublication },
              ],
            },
            holdings: index ? [{ permanentLocationId: testData.holdingLocation.id }] : [],
          }).then(({ instanceId }) => {
            instance.instanceId = instanceId;
          });
        });

        Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          testData.order = order;

          OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.getDefaultOrderLine({
              title: testData.orderLineInstanceTitle,
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethod.id,
              checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
              quantity,
              specialLocationId: testData.orderLineLocation.id,
              specialMaterialTypeId: testData.materialType.id,
            }),
            orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: testData.materialType.id,
              materialSupplier: testData.organization.id,
              volumes: [],
            },
          }).then((orderLine) => {
            testData.orderLine = orderLine;

            Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          });
        });
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventoryMoveItems.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiReceivingView.gui,
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
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.orderLineInstanceTitle);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.firstInstance.instanceId,
      );
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.secondInstance.instanceId,
      );
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C839100 Holding is not split after changing instance connection and the version history shows only a single card for changing instance connection (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C839100'] },
      () => {
        // Step 1: Click on the Order from Preconditions
        Orders.selectOrderByPONumber(testData.order.poNumber);

        // Step 2: Click on PO line record → Actions → Change instance connection
        OrderDetails.openPolDetails(testData.orderLineInstanceTitle);
        OrderLineDetails.changeInstanceConnection();

        // Step 3: Search for Instance #1 and click on it
        SelectInstanceModal.searchByName(testData.firstInstance.title);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });
        ChangeInstanceModal.verifyModalView();

        // Step 4: Select "Find or create new" → Submit → "Delete Holdings"
        ChangeInstanceModal.selectHoldingOperation({
          operation: CHANGE_INSTANCE_HOLDINGS_OPERATIONS.FIND_OR_CREATE_NEW,
          shouldConfirm: false,
        });
        ChangeInstanceModal.clickSubmitButton({ updated: false });
        DeleteHoldingsModal.clickDeleteHoldingsButton();
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [{ key: POLINE_DETAILS_FIELDS.TITLE, value: testData.firstInstance.title }],
          locationDetails: {
            isExactCount: true,
            locations: [
              [
                {
                  key: POLINE_DETAILS_FIELDS.HOLDING_NAME,
                  value: testData.orderLineLocation.name,
                },
                { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: `${quantity}` },
              ],
            ],
          },
        });

        // Step 5: Click "Version history" icon
        checkVersionHistory({
          versionsCount: initialVersionsCount + 1,
          changedFields: instanceChangedFields,
          highlightedValues: getInstanceChangedValues(testData.firstInstance),
        });

        // Step 6: Close "Version history" pane and click on "Instance #1" link
        OrderLineDetails.openInventoryItem();
        InventoryInstance.checkInstanceTitle(testData.firstInstance.title);
        InventoryInstance.verifyHoldingsAccordionsCount(1);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(
          testData.orderLineLocation.name,
          quantity,
        );

        // Step 7: Navigate back to "PO Line details" → Actions → Change instance connection
        InventoryInstance.clickAcquisitionOrderLineLink(testData.orderLine.poLineNumber);
        OrderLineDetails.changeInstanceConnection();

        // Step 8: Search for Instance #2 and click on it
        SelectInstanceModal.searchByName(testData.secondInstance.title);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });
        ChangeInstanceModal.verifyModalView();

        // Step 9: Select "Create new" → Submit → "Keep Holdings"
        ChangeInstanceModal.selectHoldingOperation({
          operation: CHANGE_INSTANCE_HOLDINGS_OPERATIONS.CREATE_NEW,
          shouldConfirm: false,
        });
        ChangeInstanceModal.clickSubmitButton({ updated: false });
        DeleteHoldingsModal.clickKeepHoldingsButton();
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [{ key: POLINE_DETAILS_FIELDS.TITLE, value: testData.secondInstance.title }],
          locationDetails: {
            isExactCount: true,
            locations: [
              [
                {
                  key: POLINE_DETAILS_FIELDS.HOLDING_NAME,
                  value: testData.orderLineLocation.name,
                },
                { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: `${quantity}` },
              ],
            ],
          },
        });

        // Step 10: Click "Version history" icon
        checkVersionHistory({
          versionsCount: initialVersionsCount + 2,
          changedFields: instanceChangedFields,
          highlightedValues: getInstanceChangedValues(testData.secondInstance),
        });

        // Step 11: Close "Version history" pane and click on "Instance #2" link
        OrderLineDetails.openInventoryItem();
        InventoryInstance.checkInstanceTitle(testData.secondInstance.title);
        InventoryInstance.verifyHoldingsAccordionsCount(2);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(
          testData.orderLineLocation.name,
          quantity,
        );
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.holdingLocation.name, 0);

        // Step 12: Move all items from PO line holding to the holding from Preconditions
        InventoryInstance.openMoveItemsWithinAnInstance();
        InventoryInstance.moveAllItemsToAnotherHolding({
          fromHolding: testData.orderLineLocation.name,
          toHolding: testData.holdingLocation.name,
          itemsCount: quantity,
        });
        InventoryInstance.openHoldings(testData.orderLineLocation.name);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.orderLineLocation.name, 0);
        InventoryInstance.openHoldings(testData.orderLineLocation.name);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(
          testData.holdingLocation.name,
          quantity,
        );

        // Step 13: Click on PO line number link in "Acquisition" accordion
        InventoryInstance.clickAcquisitionOrderLineLink(testData.orderLine.poLineNumber);
        cy.wait(5000);
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [{ key: POLINE_DETAILS_FIELDS.TITLE, value: testData.secondInstance.title }],
          locationDetails: {
            isExactCount: true,
            locations: [
              [
                { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.holdingLocation.name },
                { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: `${quantity}` },
              ],
            ],
          },
        });
        OrderLineDetails.verifyLocationAbsentInSection(testData.orderLineLocation.name);

        // Step 14: Click "Version history" icon
        checkVersionHistory({
          versionsCount: initialVersionsCount + 2 + quantity,
          changedFields: itemsMoveChangedFields,
          // Known issue: the holding is not highlighted in yellow - MODORDSTOR-527.
          // Add 'testData.holdingLocation.name' to the 'highlightedValues' array once the issue is resolved.
          highlightedValues: [`${quantity}`],
        });

        // Step 15: Close "Version history" pane and click on Title name link
        OrderLineDetails.openInventoryItem();
        InventoryInstance.checkInstanceTitle(testData.secondInstance.title);
        InventoryInstance.verifyHoldingsAccordionsCount(2);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(
          testData.holdingLocation.name,
          quantity,
        );
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.orderLineLocation.name, 0);

        // Step 16: Move one item from holding with items to another holding
        InventoryInstance.openMoveItemsWithinAnInstance();
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.holdingLocation.name,
          toHolding: testData.orderLineLocation.name,
          shouldOpen: true,
          itemMoved: true,
        });
        InventoryInstance.openHoldings(
          testData.holdingLocation.name,
          testData.orderLineLocation.name,
        );
        InventoryInstance.verifyNumberOfItemsInHoldingByName(
          testData.holdingLocation.name,
          quantity - 1,
        );
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.orderLineLocation.name, 1);

        // Step 17: Click on PO line number link in "Acquisition" accordion
        InventoryInstance.clickAcquisitionOrderLineLink(testData.orderLine.poLineNumber);
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [{ key: POLINE_DETAILS_FIELDS.TITLE, value: testData.secondInstance.title }],
        });
        OrderLineDetails.checkLocationsSectionInAnyOrder({
          isExactCount: true,
          locations: [
            [
              { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.holdingLocation.name },
              { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: `${quantity - 1}` },
            ],
            [
              { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.orderLineLocation.name },
              { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
            ],
          ],
        });

        // Step 18: Click "Version history" icon
        checkVersionHistory({
          versionsCount: initialVersionsCount + 3 + quantity,
          changedFields: itemsMoveChangedFields,
          highlightedValues: [
            // Known issue: the holding is not highlighted in yellow - MODORDSTOR-527.
            // Uncomment lines once the issue is resolved.
            // testData.orderLineLocation.name,
            // testData.holdingLocation.name,
            '1',
            `${quantity - 1}`,
          ],
        });

        // Step 19: Close "Version history" pane → Actions → Receive
        OrderLines.receiveOrderLineViaActions();

        // Step 20: Click on Title in the search result
        Receivings.selectFromResultsList(testData.secondInstance.title);
        ReceivingDetails.checkTitlePaneIsDisplayed(testData.secondInstance.title);
        ReceivingDetails.assertExpectedPiecesTotalCount(quantity);
      },
    );
  });
});
