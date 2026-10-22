import {
  CHANGE_INSTANCE_HOLDINGS_OPERATIONS,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORMATS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import { InventoryInstance, InventoryInstances } from '../../../support/fragments/inventory';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
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
        name: `AT_C784413_Organization_${getRandomPostfix()}`,
      };

      testData.orderLineInstanceTitle = `AT_C784413_FolioInstance_order_${getRandomPostfix()}`;

      cy.clearLocalStorage();
      cy.getAdminToken();
      MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
        testData.materialType = mtypes[0];
      });
      cy.getAcquisitionMethodsApi().then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
      cy.getLoanTypes({ limit: 2 }).then((loanTypes) => {
        [testData.permanentLoanType, testData.temporaryLoanType] = loanTypes;
      });
      Locations.getViaApiAnyDefault(2).then((locations) => {
        [testData.firstLocation, testData.secondLocation] = locations;
      });
      // Instance #1 without holdings
      InventoryInstance.createInstanceViaApi({
        instanceTitle: `AT_C784413_FolioInstance_first_${getRandomPostfix()}`,
      }).then(({ instanceData }) => {
        testData.instance = instanceData;
      });
      Organizations.createOrganizationViaApi(testData.organization);

      cy.then(() => {
        // Physical item (first) gets only permanent loan type, electronic item (second) gets both
        testData.items = [
          {
            format: RECEIVING_PIECE_FORMATS.PHYSICAL,
            location: testData.firstLocation,
            // Permanent loan type is shown only since Umbrellaleaf (UIOR-1565), Trillium shows '-'
            loanTypeName: '-',
            temporaryLoanType: undefined,
          },
          {
            format: RECEIVING_PIECE_FORMATS.ELECTRONIC,
            location: testData.secondLocation,
            loanTypeName: testData.temporaryLoanType.name,
            temporaryLoanType: { id: testData.temporaryLoanType.id },
          },
        ].map((item, index) => ({
          ...item,
          barcode: FinanceHelper.getRandomBarcode(),
          copyNumber: `AT_C784413_copy_${index + 1}`,
          enumeration: `AT_C784413_enum_${index + 1}`,
          chronology: `AT_C784413_chron_${index + 1}`,
          volume: `AT_C784413_vol_${index + 1}`,
          yearCaption: `AT_C784413_year_${index + 1}`,
        }));

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
              Receivings.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
                Receivings.receivePieceViaApi({
                  poLineId: testData.orderLine.id,
                  pieces: pieces.map(({ id }) => ({ id })),
                }).then(() => {
                  testData.items.forEach((item) => {
                    const { itemId } = pieces.find(({ format }) => format === item.format);

                    InventoryItems.getItemByIdViaApi(itemId).then((itemRecord) => {
                      cy.updateItemViaApi({
                        ...itemRecord,
                        barcode: item.barcode,
                        copyNumber: item.copyNumber,
                        enumeration: item.enumeration,
                        chronology: item.chronology,
                        volume: item.volume,
                        yearCaption: [item.yearCaption],
                        permanentLoanType: { id: testData.permanentLoanType.id },
                        temporaryLoanType: item.temporaryLoanType,
                      });
                    });
                  });
                });
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
      'C784413 Item appears under holdings after instance connection change with holding setting "Find or create new" for P/E mix order with Synchronized workflow (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C784413'] },
      () => {
        // Step 1: Click on the order from Preconditions #2
        Orders.selectOrderByPONumber(testData.order.poNumber);

        // Step 2: Click on PO line record → Actions → Change instance connection
        OrderDetails.openPolDetails(testData.orderLineInstanceTitle);
        OrderLineDetails.changeInstanceConnection();

        // Step 3: Search for Instance #1 and click on it
        SelectInstanceModal.searchByName(testData.instance.instanceTitle);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });
        ChangeInstanceModal.verifyModalView();
        ChangeInstanceModal.checkItemsTableColumns();
        ChangeInstanceModal.checkItemsTableContent(
          testData.items.map((item) => ({
            barcode: item.barcode,
            columns: {
              'Item: barcode': item.barcode,
              Status: ITEM_STATUS_NAMES.IN_PROCESS,
              'Copy number': item.copyNumber,
              'Loan type': item.loanTypeName,
              'Effective location': item.location.name,
              Enumeration: item.enumeration,
              Chronology: item.chronology,
              Volume: item.volume,
              'Year, caption': item.yearCaption,
              'Material type': testData.materialType.name,
            },
          })),
        );

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
