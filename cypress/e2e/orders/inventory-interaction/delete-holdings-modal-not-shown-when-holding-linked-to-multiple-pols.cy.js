import {
  CHANGE_INSTANCE_HOLDINGS_OPERATIONS,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
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
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import { Locations } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {};

    before('Create test data', () => {
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C825371_Organization_${getRandomPostfix()}`,
      };

      testData.orderLineInstanceTitle = `AT_C825371_FolioInstance_order_${getRandomPostfix()}`;

      cy.clearLocalStorage();
      cy.getAdminToken();
      MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
        testData.materialType = mtypes[0];
      });
      Locations.getViaApiAnyDefault().then(([location]) => {
        testData.location = location;
      });
      // Instance #1 without holdings
      InventoryInstance.createInstanceViaApi({
        instanceTitle: `AT_C825371_FolioInstance_first_${getRandomPostfix()}`,
      }).then(({ instanceData }) => {
        testData.instance = instanceData;
      });
      Organizations.createOrganizationViaApi(testData.organization);

      cy.then(() => {
        const checkinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT];

        // Order #1 with a newly created title
        Orders.createOrderWithOrderLineViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          BasicOrderLine.getDefaultOrderLine({
            title: testData.orderLineInstanceTitle,
            checkinItems,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
        ).then((firstOrder) => {
          testData.firstOrder = firstOrder;

          Orders.updateOrderViaApi({ ...firstOrder, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineViaApi({ query: `purchaseOrderId=="${firstOrder.id}"` }).then(
            ([firstOrderLine]) => {
              testData.firstOrderLine = firstOrderLine;

              // Order #2 with the same title and the same holding as Order #1
              Orders.createOrderWithOrderLineViaApi(
                NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                {
                  ...BasicOrderLine.getDefaultOrderLine({
                    title: testData.orderLineInstanceTitle,
                    instanceId: firstOrderLine.instanceId,
                    checkinItems,
                    specialLocationId: testData.location.id,
                    specialMaterialTypeId: testData.materialType.id,
                  }),
                  locations: [
                    {
                      holdingId: firstOrderLine.locations[0].holdingId,
                      quantity: 1,
                      quantityPhysical: 1,
                    },
                  ],
                },
              ).then((secondOrder) => {
                testData.secondOrder = secondOrder;

                Orders.updateOrderViaApi({ ...secondOrder, workflowStatus: ORDER_STATUSES.OPEN });
                OrderLines.getOrderLineViaApi({
                  query: `purchaseOrderId=="${secondOrder.id}"`,
                }).then(([secondOrderLine]) => {
                  testData.secondOrderLine = secondOrderLine;
                });
              });
            },
          );
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersEdit.gui,
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
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.orderLineInstanceTitle);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C825371 "Delete Holdings" modal does not appear when changing instance connection if the holding is linked to multiple POLs without any pieces (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C825371'] },
      () => {
        // Step 1: Click on the Order #1 from Preconditions
        Orders.selectOrderByPONumber(testData.firstOrder.poNumber);

        // Step 2: Click on PO line record → Actions → Change instance connection
        OrderDetails.openPolDetails(testData.orderLineInstanceTitle);
        OrderLineDetails.changeInstanceConnection();

        // Step 3: Search for Instance #1 and click on it
        SelectInstanceModal.searchByName(testData.instance.instanceTitle);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });
        ChangeInstanceModal.verifyModalView();
        ChangeInstanceModal.checkItemsTableIsEmpty();

        // Step 4: Select "Create new" in "How to update Holdings" dropdown and click "Submit"
        ChangeInstanceModal.selectHoldingOperation({
          operation: CHANGE_INSTANCE_HOLDINGS_OPERATIONS.CREATE_NEW,
          shouldConfirm: false,
        });
        ChangeInstanceModal.clickSubmitButton();
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [
            { key: POLINE_DETAILS_FIELDS.TITLE, value: testData.instance.instanceTitle },
          ],
          locationDetails: {
            locations: [
              [{ key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.location.name }],
            ],
          },
        });

        // Step 5: Search for the Order #2 from Preconditions and click on it
        Orders.selectOrderByPONumber(testData.secondOrder.poNumber);

        // Step 6: Click on PO line record in "PO lines" accordion
        OrderDetails.openPolDetails(testData.orderLineInstanceTitle);
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [
            { key: POLINE_DETAILS_FIELDS.TITLE, value: testData.orderLineInstanceTitle },
          ],
          locationDetails: {
            locations: [
              [{ key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.location.name }],
            ],
          },
        });

        // Step 7: Click on the "Title name" link in "Item details" accordion
        OrderLineDetails.openInventoryItem();
        InventoryInstance.checkInstanceTitle(testData.orderLineInstanceTitle);
        InventoryInstance.verifyHoldingsAccordionsCount(1);
        InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 0 });
        InventoryInstance.verifyAcquisitionAccordionOrderLineLink(
          testData.secondOrderLine.poLineNumber,
        );

        // Step 8: Search for the Instance #1 from Preconditions
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(testData.instance.instanceTitle);
        InventoryInstance.verifyHoldingsAccordionsCount(1);
        InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 0 });
        InventoryInstance.verifyAcquisitionAccordionOrderLineLink(
          testData.firstOrderLine.poLineNumber,
        );
      },
    );
  });
});
