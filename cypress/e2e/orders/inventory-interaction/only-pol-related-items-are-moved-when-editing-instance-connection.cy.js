import {
  CHANGE_INSTANCE_HOLDINGS_OPERATIONS,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { InventoryInstance, InventoryInstances } from '../../../support/fragments/inventory';
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
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { Locations } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {};

    before('Create test data', () => {
      testData.firstInstance = {
        instanceTitle: `AT_C357530_FolioInstance_first_${getRandomPostfix()}`,
        contributor: `AT_C357530_Contributor_${getRandomPostfix()}`,
        productId: '9780306406157',
      };
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C357530_Organization_${getRandomPostfix()}`,
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
        // Title #2
        InventoryInstance.createInstanceViaApi({
          instanceTitle: `AT_C357530_FolioInstance_second_${getRandomPostfix()}`,
        }).then(({ instanceData }) => {
          testData.secondInstance = instanceData;
        });
        cy.getDefaultMaterialType().then((materialType) => {
          Organizations.createOrganizationViaApi(testData.organization).then(() => {
            // Order #1 with PO Line #1 - one item
            testData.firstOrder = NewOrder.getDefaultOngoingOrder({
              vendorId: testData.organization.id,
            });
            testData.firstOrderLine = BasicOrderLine.getDefaultOrderLine({
              title: testData.secondInstance.instanceTitle,
              instanceId: testData.secondInstance.instanceId,
              specialLocationId: testData.location.id,
              specialMaterialTypeId: materialType.id,
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            });

            Orders.createOrderWithOrderLineViaApi(
              testData.firstOrder,
              testData.firstOrderLine,
            ).then((firstOrder) => {
              testData.firstOrder = firstOrder;

              Orders.updateOrderViaApi({
                ...testData.firstOrder,
                workflowStatus: ORDER_STATUSES.OPEN,
              });
              cy.getHoldings({
                query: `instanceId==${testData.secondInstance.instanceId}`,
              }).then((holdings) => {
                // Order #2 with PO Line #2 - two items in the holding created by Order #1
                testData.secondOrder = NewOrder.getDefaultOngoingOrder({
                  vendorId: testData.organization.id,
                });
                testData.secondOrderLine = {
                  ...BasicOrderLine.getDefaultOrderLine({
                    quantity: 2,
                    title: testData.secondInstance.instanceTitle,
                    instanceId: testData.secondInstance.instanceId,
                    specialLocationId: testData.location.id,
                    specialMaterialTypeId: materialType.id,
                    createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
                  }),
                  locations: [{ holdingId: holdings[0].id, quantity: 2, quantityPhysical: 2 }],
                };

                Orders.createOrderWithOrderLineViaApi(
                  testData.secondOrder,
                  testData.secondOrderLine,
                ).then((secondOrder) => {
                  testData.secondOrder = secondOrder;

                  Orders.updateOrderViaApi({
                    ...testData.secondOrder,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                });
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
      Orders.deleteOrderViaApi(testData.firstOrder.id);
      Orders.deleteOrderViaApi(testData.secondOrder.id);
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
      'C357530 Only items related to POL are moved with Holdings when editing instance connection from POL (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C357530'] },
      () => {
        // Step 1: Go to "Orders" app, search for Order #1 and click on it
        Orders.selectOrderByPONumber(testData.firstOrder.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Step 2: Expand PO Lines accordion and click "PO Line #1" record
        OrderDetails.openPolDetails(testData.secondInstance.instanceTitle);

        // Step 3: Click "Actions" button on "PO Line details" pane and select "Change Instance connection" option
        OrderLineDetails.changeInstanceConnection();

        // Step 4: Select Title #1 from Precondition #2
        SelectInstanceModal.searchByName(testData.firstInstance.instanceTitle);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });

        // Step 5: Choose "Find or create new" option in "How to update holdings" drop-down field
        ChangeInstanceModal.checkHowToUpdateHoldingsOptionDisabled(
          CHANGE_INSTANCE_HOLDINGS_OPERATIONS.MOVE,
        );
        ChangeInstanceModal.selectHoldingOperation({
          operation: CHANGE_INSTANCE_HOLDINGS_OPERATIONS.FIND_OR_CREATE_NEW,
          shouldConfirm: false,
        });
        ChangeInstanceModal.checkHowToUpdateHoldingsValue(
          CHANGE_INSTANCE_HOLDINGS_OPERATIONS.FIND_OR_CREATE_NEW,
        );

        // Step 6: Click "Submit" button
        ChangeInstanceModal.clickSubmitButton({ updated: true });
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
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 1);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.location.name,
          records: [{ status: ITEM_STATUS_NAMES.ON_ORDER, location: testData.location.name }],
        });

        // Step 8: In the "Inventory" app search for "Title #1" from precondition #2 and click on it
        InventoryInstances.searchByTitle(testData.firstInstance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(testData.firstInstance.instanceTitle);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 1);
        InventoryInstance.checkAcquisitionsDetails([
          { polNumber: `${testData.firstOrder.poNumber}-1` },
        ]);

        // Step 9: In the "Inventory" app search for "Title #2" from precondition #3 and click on it
        InventoryInstances.searchByTitle(testData.secondInstance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(testData.secondInstance.instanceTitle);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 2);
        InventoryInstance.checkAcquisitionsDetails([
          { polNumber: `${testData.secondOrder.poNumber}-1` },
        ]);
      },
    );
  });
});
