import {
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORMATS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Receivings } from '../../support/fragments/receiving';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const QUANTITY = 1;
  let testData;

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C464072_FolioInstance_${getRandomPostfix()}`,
    };
    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
      testData.materialType = mtypes[0];
    });
    cy.getAcquisitionMethodsApi().then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    // "Loc1" used on POL and "Loc2" selected for the Electronic piece later
    Locations.getViaApiAnyDefault(2).then((locations) => {
      [testData.polLocation, testData.newLocation] = locations;
    });

    // Precondition 1: Instance with only two Holdings ("Loc1" and "Loc2") and no items
    cy.then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: holdingTypes[0].id,
                permanentLocationId: testData.polLocation.id,
              },
              {
                holdingsTypeId: holdingTypes[0].id,
                permanentLocationId: testData.newLocation.id,
              },
            ],
          }).then((instanceData) => {
            testData.instanceId = instanceData.instanceId;
            testData.polHoldingId = instanceData.holdings[0].id;
          });
        });
      });
    });

    // Precondition 2: Open One-time Order with P/E mix POL linked to Instance, synchronized workflow
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        const orderLine = {
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.instanceTitle,
            instanceId: testData.instanceId,
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
            quantityPhysical: QUANTITY,
            quantityElectronic: QUANTITY,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
          },
          eresource: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            accessProvider: testData.organization.id,
          },
          locations: [
            {
              holdingId: testData.polHoldingId,
              quantityPhysical: QUANTITY,
              quantityElectronic: QUANTITY,
            },
          ],
        };

        OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
          testData.orderLine = createdOrderLine;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Precondition 3: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingViewEdit.gui,
      Permissions.uiInventoryViewInstances.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 4: User is on "Orders" app with details pane opened for Order
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.selectOrderByPONumber(testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C464072 Changing Electronic piece location in Receiving app with order format = P/E mix (Instance selected from "Title look-up") (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C464072'] },
    () => {
      // Step 1: On Order details pane click "Actions" -> "Receive"
      OrderDetails.openReceivingsPage();
      Receivings.assertReceivingResults([testData.instanceTitle]);

      // Step 2: Click on the found receiving Title
      const ReceivingDetails = Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(2);

      // Step 3: Click on the piece with "Piece format" = "Electronic"
      const EditPieceModal = ReceivingDetails.openEditPieceModalByFormat(
        RECEIVING_PIECE_FORMATS.ELECTRONIC,
      );
      EditPieceModal.checkFieldsConditions([
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.PIECE_FORMAT,
          conditions: { value: RECEIVING_PIECE_FORMATS.ELECTRONIC },
        },
      ]);

      // Step 4: Select another available location ("Loc2") from "Select holdings" dropdown
      EditPieceModal.selectHolding(testData.newLocation.name);
      EditPieceModal.verifySelectedHolding(testData.newLocation.name);

      // Step 5: Click on "Save & close" button
      EditPieceModal.clickSaveAndCloseButton();

      // Step 6: Click on "POL number" link on Title details pane
      const OrderLineDetails = ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Holding', value: testData.polLocation.name },
            { key: 'Quantity physical', value: QUANTITY },
          ],
          [
            { key: 'Holding', value: testData.newLocation.name },
            { key: 'Quantity electronic', value: QUANTITY },
          ],
        ],
      });

      // Step 7: Click on "Title" hyperlink on top of the PO line details pane
      const InventoryInstance = OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.checkHoldingTitle({ title: testData.polLocation.name, count: 1 });
      InventoryInstance.checkHoldingTitle({ title: testData.newLocation.name, count: 1 });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.polLocation.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.newLocation.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
    },
  );
});
