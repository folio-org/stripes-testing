import { v4 as uuid } from 'uuid';

import {
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstance, InventoryInstances } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  NewPiece,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BindPiecesForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      existingInstance: InventoryInstances.generateFolioInstances({
        instanceTitlePrefix: `AT_C773251_FolioInstance_Existing_${postfix}`,
      })[0],
      instanceTitle: `AT_C773251_FolioInstance_${postfix}`,
      piece1: {
        id: uuid(),
        displaySummary: `AT_C773251_Piece_1_${postfix}`,
        barcode: `AT_C773251_Piece_1_Barcode_${postfix}`,
      },
      piece2: {
        id: uuid(),
        displaySummary: `AT_C773251_Piece_2_${postfix}`,
        barcode: `AT_C773251_Piece_2_Barcode_${postfix}`,
      },
      boundItemCallNumber: `AT_C773251_BoundItem_CallNumber_${postfix}`,
    };

    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault(2).then((locations) => {
      [testData.location1, testData.location2] = locations;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getLoanTypes({ limit: 1 }).then(([loanType]) => {
      testData.loanType = loanType;
    });
    cy.getAcquisitionMethodsApi({ limit: 1 }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    // Instance with holding and one item with barcode, which is used as non-unique barcode
    cy.then(() => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: [testData.existingInstance],
        location: testData.location1,
      });
    });

    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          titleOrPackage: testData.instanceTitle,
          checkinItems: true,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.location1.id, quantity: 2, quantityPhysical: 2 }],
          details: {
            ...BasicOrderLine.defaultOrderLine.details,
            isBinderyActive: true,
          },
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: 2,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });
        });
      });
    });

    // Both pieces have related items in the POL location ("Loc 1") and are received
    cy.then(() => {
      const { orderLine, piece1, piece2 } = testData;

      Receivings.getTitleByPoLineIdViaApi(orderLine.id).then((title) => {
        const pieceDefaults = {
          ...NewPiece.defaultPiece,
          poLineId: orderLine.id,
          titleId: title.id,
          holdingId: orderLine.locations[0].holdingId,
        };

        Pieces.upsertOrderPiecesBatchViaApi(
          [
            { ...pieceDefaults, ...piece1 },
            { ...pieceDefaults, ...piece2 },
          ],
          { createItem: true },
        );
      });
      cy.then(() => {
        Receivings.receivePieceViaApi({
          poLineId: orderLine.id,
          pieces: [{ id: piece1.id }, { id: piece2.id }],
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiInventoryInstanceView,
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingCreate,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
      Receivings.searchByParameter({ value: testData.instanceTitle });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.existingInstance.instanceId,
    );
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C773251 Holding is not created when binding pieces with a non-unique barcode for a newly created item (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C773251'] },
    () => {
      const { piece1, piece2 } = testData;

      // Step 1: Click on Title record related to POL
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(2);
      ReceivingDetails.checkReceivedPiecesPresent([piece1.displaySummary, piece2.displaySummary]);

      // Step 2: Click "Actions" button in "Received" accordion and select "Bind piece" option
      ReceivingDetails.clickReceivedAccordionActionsMenuOption(BIND_PIECES_OPTION);
      BindPiecesForm.waitLoading();
      BindPiecesForm.checkFormTitle(
        `${testData.orderLine.poLineNumber} - ${testData.instanceTitle}`,
      );

      // Step 3: Select all pieces, fill the fields with existing item barcode and click "Bind"
      BindPiecesForm.selectAllPieces();
      BindPiecesForm.fillBindItemDetails({
        newHoldingLocation: testData.location2.name,
      });
      BindPiecesForm.fillBindItemDetails({
        barcode: testData.existingInstance.barcodes[0],
        materialType: testData.materialType.name,
        callNumber: testData.boundItemCallNumber,
        permanentLoanType: testData.loanType.name,
      });
      BindPiecesForm.clickBindButton({ errorMessage: ReceivingStates.barcodeIsNotUnique });
      BindPiecesForm.checkFormTitle(
        `${testData.orderLine.poLineNumber} - ${testData.instanceTitle}`,
      );

      // Step 4: Click "Cancel" button and click "Title name" link above "Title information" accordion
      BindPiecesForm.clickCancelButton({ hasUnsavedChanges: true });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location1.name, 2);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location1.name,
        records: [
          { status: ITEM_STATUS_NAMES.IN_PROCESS },
          { status: ITEM_STATUS_NAMES.IN_PROCESS },
        ],
      });
      InventoryInstance.checkIsItemCreated(piece1.barcode);
      InventoryInstance.checkIsItemCreated(piece2.barcode);
    },
  );
});
