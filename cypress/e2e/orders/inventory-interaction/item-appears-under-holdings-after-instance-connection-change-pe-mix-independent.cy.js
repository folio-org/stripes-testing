import {
  CHANGE_INSTANCE_HOLDINGS_OPERATIONS,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  InventoryHoldings,
  InventoryInstance,
  InventoryInstances,
} from '../../../support/fragments/inventory';
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
import { Receivings } from '../../../support/fragments/receiving';
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
        name: `AT_C736708_Organization_${getRandomPostfix()}`,
      };

      testData.orderLineInstanceTitle = `AT_C736708_FolioInstance_order_${getRandomPostfix()}`;

      cy.clearLocalStorage();
      cy.getAdminToken();
      MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
        testData.materialType = mtypes[0];
      });
      cy.getAcquisitionMethodsApi().then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
      Locations.getViaApiAnyDefault(2).then((locations) => {
        [testData.firstLocation, testData.secondLocation] = locations;
      });
      Organizations.createOrganizationViaApi(testData.organization);

      cy.then(() => {
        // Instance #1 with one holding at firstLocation
        InventoryInstance.createInstanceViaApi({
          instanceTitle: `AT_C736708_FolioInstance_first_${getRandomPostfix()}`,
        }).then(({ instanceData }) => {
          testData.instance = instanceData;

          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instance.instanceId,
              permanentLocationId: testData.firstLocation.id,
              sourceId: folioSource.id,
            });
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
              checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT],
            }),
            orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
            cost: {
              currency: 'USD',
              discountType: 'percentage',
              listUnitPrice: 10,
              listUnitPriceElectronic: 10,
              quantityPhysical: 1,
              quantityElectronic: 1,
            },
            locations: [
              {
                locationId: testData.firstLocation.id,
                quantityPhysical: 1,
                quantityElectronic: 0,
              },
              {
                locationId: testData.secondLocation.id,
                quantityPhysical: 0,
                quantityElectronic: 1,
              },
            ],
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: testData.materialType.id,
              materialSupplier: testData.organization.id,
              volumes: [],
            },
            eresource: {
              activated: false,
              trial: false,
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: testData.materialType.id,
              accessProvider: testData.organization.id,
            },
          }).then((orderLine) => {
            testData.orderLine = orderLine;

            Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN }).then(() => {
              // Two physical pieces in the POL holdings (firstLocation and secondLocation) with items
              [testData.firstLocation, testData.secondLocation].forEach((location) => {
                Receivings.addPieceViaApi(
                  {
                    poLineId: testData.orderLine.id,
                    poLineNumber: testData.orderLine.poLineNumber,
                    format: ORDER_FORMAT_VALUES.PE_MIX,
                    searchParams: { createItem: 'true' },
                  },
                  { locationId: location.id },
                );
              });
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersCreate.gui,
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
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.orderLineInstanceTitle);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C736708 Item appears under holdings after instance connection change with holding setting "Find or create new" for P/E mix order with Independent workflow (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C736708'] },
      () => {
        // Step 1: Click on the order from Preconditions #2
        Orders.selectOrderByPONumber(testData.order.poNumber);

        // Step 2: Click on PO line record → Actions → Change instance connection
        OrderDetails.openPolDetails(testData.orderLineInstanceTitle);
        OrderLineDetails.changeInstanceConnection();

        // Step 3: Search for Instance #1 and click on it
        SelectInstanceModal.searchByName(testData.instance.instanceTitle);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });

        // Step 4: Select "Find or create new" in "How to update Holdings" dropdown and click "Submit"
        ChangeInstanceModal.selectHoldingOperation({
          operation: CHANGE_INSTANCE_HOLDINGS_OPERATIONS.FIND_OR_CREATE_NEW,
          shouldConfirm: false,
        });
        ChangeInstanceModal.clickSubmitButton({ updated: false });
        DeleteHoldingsModal.verifyModalView();

        // Step 5: Click "Delete Holdings" button
        DeleteHoldingsModal.clickDeleteHoldingsButton();
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [
            { key: POLINE_DETAILS_FIELDS.TITLE, value: testData.instance.instanceTitle },
          ],
        });

        // Step 6: Scroll down to "Location" accordion
        OrderLineDetails.checkLocationsSectionInAnyOrder({
          locations: [
            [
              { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
              { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
            ],
            [
              { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.secondLocation.name },
              { key: POLINE_DETAILS_FIELDS.QUANTITY_ELECTRONIC, value: '1' },
            ],
          ],
        });

        // Step 7: Click on "Instance #1" link in "Item details" accordion
        OrderLineDetails.openInventoryItem();
        InventoryInstance.checkInstanceTitle(testData.instance.instanceTitle);
        InventoryInstance.verifyHoldingsAccordionsCount(2);
        InventoryInstance.checkHoldingTitle({ title: testData.firstLocation.name });
        InventoryInstance.checkHoldingTitle({ title: testData.secondLocation.name });
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.firstLocation.name, 1);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.secondLocation.name, 1);

        // Step 8: Search for the title related to the order from Preconditions and click on it
        InventoryInstances.searchByTitle(testData.orderLineInstanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(testData.orderLineInstanceTitle);
        InventoryInstance.verifyHoldingsAccordionsCount(0);
      },
    );
  });
});
