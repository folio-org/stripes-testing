import {
  APPLICATION_NAMES,
  CHANGE_INSTANCE_HOLDINGS_OPERATIONS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  POL_CREATE_INVENTORY_SETTINGS,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  RECEIPT_STATUS_VIEW,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  InventoryHoldings,
  InventoryInstance,
  InventoryInstances,
} from '../../../support/fragments/inventory';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import ChangeInstanceModal from '../../../support/fragments/orders/modals/changeInstanceModal';
import DeleteHoldingsModal from '../../../support/fragments/orders/modals/deleteHoldingsModal';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../../support/fragments/receiving';
import { Locations } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {};

    before('Create test data', () => {
      testData.firstInstance = {
        instanceTitle: `AT_C358153_FolioInstance_first_${getRandomPostfix()}`,
        contributor: `AT_C358153_Contributor_${getRandomPostfix()}`,
        productId: '9780306406157',
      };
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C358153_Organization_${getRandomPostfix()}`,
      };

      cy.clearLocalStorage();
      cy.getAdminToken();
      Locations.getViaApiAnyDefault().then((locations) => {
        [testData.location] = locations;

        // Title #1 - instance with item details
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            cy.getProductIdTypes({ query: 'name=="ISBN"' }).then((productIdType) => {
              [testData.contributorNameType] = contributorNameTypes;
              testData.productIdType = productIdType;

              cy.createInstance({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: testData.firstInstance.instanceTitle,
                  contributors: [
                    {
                      name: testData.firstInstance.contributor,
                      contributorNameTypeId: testData.contributorNameType.id,
                      primary: true,
                    },
                  ],
                  identifiers: [
                    {
                      identifierTypeId: testData.productIdType.id,
                      value: testData.firstInstance.productId,
                    },
                  ],
                },
              }).then((instanceId) => {
                testData.firstInstance.instanceId = instanceId;
              });
            });
          });
        });
        // Title #2 - instance with one holding
        InventoryInstance.createInstanceViaApi({
          instanceTitle: `AT_C358153_FolioInstance_second_${getRandomPostfix()}`,
        }).then(({ instanceData }) => {
          testData.secondInstance = instanceData;
        });
        cy.getDefaultMaterialType().then((materialType) => {
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.secondInstance.instanceId,
              permanentLocationId: testData.location.id,
              sourceId: folioSource.id,
            }).then((holding) => {
              Organizations.createOrganizationViaApi(testData.organization).then(() => {
                testData.order = NewOrder.getDefaultOngoingOrder({
                  vendorId: testData.organization.id,
                });
                // PO Line #1 uses the existing holding of Title #2
                testData.orderLine = {
                  ...BasicOrderLine.getDefaultOrderLine({
                    title: testData.secondInstance.instanceTitle,
                    instanceId: testData.secondInstance.instanceId,
                    specialLocationId: testData.location.id,
                    specialMaterialTypeId: materialType.id,
                    createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
                  }),
                  locations: [{ holdingId: holding.id, quantity: 1, quantityPhysical: 1 }],
                };

                Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
                  (order) => {
                    testData.order = order;

                    Orders.updateOrderViaApi({
                      ...testData.order,
                      workflowStatus: ORDER_STATUSES.OPEN,
                    });
                  },
                );
              });
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.inventoryCRUDHoldings.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersView.gui,
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.firstInstance.instanceId,
      );
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.secondInstance.instanceId,
      );
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C358153 Edit instance connection of POL - deleting abandoned holdings (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C358153'] },
      () => {
        // Step 1: Go to "Orders" app, search for Order #1 and click on it
        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
        OrderDetails.checkOrderLinesTableContent([
          {
            poLineNumber: `${testData.order.poNumber}-1`,
            poLineTitle: testData.secondInstance.instanceTitle,
          },
        ]);

        // Step 2: Click PO Line #1 record in "PO lines" accordion
        OrderDetails.openPolDetails(testData.secondInstance.instanceTitle);
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [
            { key: POLINE_DETAILS_FIELDS.TITLE, value: testData.secondInstance.instanceTitle },
          ],
          physicalResourceDetails: [
            {
              key: POLINE_DETAILS_FIELDS.CREATE_INVENTORY,
              value: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
            },
          ],
          linkedInstances: [{ title: testData.secondInstance.instanceTitle }],
        });

        // Step 3: Click "Actions" button on "PO Line details" pane and select "Change Instance connection" option
        OrderLineDetails.changeInstanceConnection();

        // Step 4: Select Title #1 from Precondition #2 and click on it
        SelectInstanceModal.searchByName(testData.firstInstance.instanceTitle);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });
        ChangeInstanceModal.checkHowToUpdateHoldingsValue('');
        ChangeInstanceModal.checkHowToUpdateHoldingsOptions();
        ChangeInstanceModal.checkItemsTableColumns();

        // Step 5: Choose "Find or create new" option from dropdown and click "Submit" button
        ChangeInstanceModal.selectHoldingOperation({
          operation: CHANGE_INSTANCE_HOLDINGS_OPERATIONS.FIND_OR_CREATE_NEW,
          shouldConfirm: false,
        });
        ChangeInstanceModal.clickSubmitButton({ updated: false });
        DeleteHoldingsModal.verifyModalView();

        // Step 6: Click "Delete Holdings" button
        DeleteHoldingsModal.clickDeleteHoldingsButton();
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [
            { key: POLINE_DETAILS_FIELDS.TITLE, value: testData.firstInstance.instanceTitle },
          ],
          linkedInstances: [
            {
              title: testData.firstInstance.instanceTitle,
              contributors: testData.firstInstance.contributor,
            },
          ],
        });
        OrderLineDetails.checkContributorsSectionContent([
          { name: testData.firstInstance.contributor, type: testData.contributorNameType.name },
        ]);
        OrderLines.verifyProductIdentifier({
          productId: testData.firstInstance.productId,
          productIdType: testData.productIdType.name,
        });

        // Step 7: Click on "Title" link in "Item details" accordion on "PO Line details" pane
        OrderLineDetails.openInventoryItem();
        InventoryInstance.checkInstanceTitle(testData.firstInstance.instanceTitle);
        InventoryInstance.checkHoldingTitle({ title: testData.location.name });
        InventoryInstance.checkHoldingsTable(
          testData.location.name,
          0,
          LOAN_TYPE_NAMES.CAN_CIRCULATE,
          'No barcode',
          ITEM_STATUS_NAMES.ON_ORDER,
          testData.location.name,
        );
        InventoryInstance.checkAcquisitionsDetails([
          {
            polNumber: `${testData.order.poNumber}-1`,
            orderStatus: ORDER_STATUSES.OPEN,
            receiptStatus: RECEIPT_STATUS_VIEW.ONGOING,
          },
        ]);

        // Step 8: Go to "Inventory" app, search for "Title #2" and click on it
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.searchByTitle(testData.secondInstance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(testData.secondInstance.instanceTitle);
        InventoryInstance.verifyHoldingsAbsent(testData.location.name);

        // Step 9: Navigate back to PO Line #1 record, click "Actions" button, select "Receive" option
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        OrderLines.receiveOrderLineViaActions();
        Receivings.waitLoading();
        Receivings.checkTitleInReceivingList(testData.firstInstance.instanceTitle);

        // Step 10: Click on Title in the search result
        Receivings.selectFromResultsList(testData.firstInstance.instanceTitle);
        ReceivingDetails.checkTitlePaneIsDisplayed(testData.firstInstance.instanceTitle);
        ReceivingDetails.verifyExpectedRecordsCount(1);
      },
    );
  });
});
