import { v4 as uuid } from 'uuid';

import {
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_FORM_MODES,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstances } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  NewPiece,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { PieceForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';
const PIECES_TOTAL = 2;

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      physicalOrder: { instanceTitle: `AT_C476877_FolioInstance_Physical_${postfix}` },
      electronicOrder: { instanceTitle: `AT_C476877_FolioInstance_Electronic_${postfix}` },
    };

    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then(([location]) => {
      testData.location = location;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getAcquisitionMethodsApi({ limit: 1 }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    // Order #1: ongoing order with physical POL, "Bindery active" unchecked, independent workflow
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.physicalOrder.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          titleOrPackage: testData.physicalOrder.instanceTitle,
          checkinItems: true,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [
            {
              locationId: testData.location.id,
              quantity: PIECES_TOTAL,
              quantityPhysical: PIECES_TOTAL,
            },
          ],
          details: {
            ...BasicOrderLine.defaultOrderLine.details,
            isBinderyActive: false,
          },
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: PIECES_TOTAL,
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
            testData.physicalOrder.orderLine = openedOrderLine;
          });
        });
      });
    });

    // Two received pieces without related items
    cy.then(() => {
      const { orderLine } = testData.physicalOrder;

      Receivings.getTitleByPoLineIdViaApi(orderLine.id).then((title) => {
        const pieces = [...Array(PIECES_TOTAL)].map(() => ({
          ...NewPiece.defaultPiece,
          id: uuid(),
          poLineId: orderLine.id,
          titleId: title.id,
          holdingId: orderLine.locations[0].holdingId,
        }));

        Pieces.upsertOrderPiecesBatchViaApi(pieces, { createItem: false });
        Pieces.updateOrderPiecesStatusesBatchViaApi({
          pieceIds: pieces.map(({ id }) => id),
          receivingStatus: RECEIVING_PIECE_STATUSES.RECEIVED,
        });
      });
    });

    // Order #2: one-time order with electronic POL, "Bindery active" unchecked, synchronized workflow
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.electronicOrder.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          titleOrPackage: testData.electronicOrder.instanceTitle,
          checkinItems: false,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.ELECTRONIC_RESOURCE,
          locations: [
            {
              locationId: testData.location.id,
              quantity: PIECES_TOTAL,
              quantityElectronic: PIECES_TOTAL,
            },
          ],
          details: {
            ...BasicOrderLine.defaultOrderLine.details,
            isBinderyActive: false,
          },
          cost: {
            currency: 'USD',
            discountType: 'percentage',
            listUnitPriceElectronic: 10,
            quantityElectronic: PIECES_TOTAL,
          },
          // Default physical details with empty material type and supplier fail validation
          physical: undefined,
          eresource: {
            activated: false,
            trial: false,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            accessProvider: testData.organization.id,
          },
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.electronicOrder.orderLine = openedOrderLine;
          });
        });
      });
    });

    // One of two pieces created on opening the order is received
    cy.then(() => {
      Receivings.getPiecesViaApi(testData.electronicOrder.orderLine.id).then(([piece]) => {
        Pieces.updateOrderPiecesStatusesBatchViaApi({
          pieceIds: [piece.id],
          receivingStatus: RECEIVING_PIECE_STATUSES.RECEIVED,
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingCreate,
          CapabilitySets.uiInventoryInstanceView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
      Receivings.searchByParameter({ value: testData.physicalOrder.instanceTitle });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    [testData.physicalOrder, testData.electronicOrder].forEach(({ order, orderLine }) => {
      Orders.deleteOrderViaApi(order.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(orderLine.instanceId);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C476877 "Bind pieces" option is not displayed when bindery inactive in PO line, verify "Bound" flag for piece (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C476877'] },
    () => {
      const { physicalOrder, electronicOrder } = testData;

      // Step 1: Click on Title record related to POL from Order #1
      Receivings.selectFromResultsList(physicalOrder.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(physicalOrder.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(PIECES_TOTAL);

      // Step 2: Click "Actions" button in "Received" accordion
      ReceivingDetails.checkReceivedAccordionActionsMenuOptions([BIND_PIECES_OPTION], {
        shouldExist: false,
      });

      // Step 3: Click "Actions" button in "Expected" accordion and select "Add piece" option
      Receivings.addPieceInActions();
      PieceForm.waitLoading(RECEIVING_PIECE_FORM_MODES.CREATE);
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, false, {
        disabled: true,
      });

      // Step 4: Click "Save & close" button
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 5: Click on just created piece record in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      PieceForm.waitLoading(RECEIVING_PIECE_FORM_MODES.EDIT);
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, false, {
        disabled: true,
      });

      // Step 6: Search for the Title related to POL from Order #2
      EditPieceModal.clickCancelButton();
      Receivings.searchByParameter({ value: electronicOrder.instanceTitle });
      Receivings.selectFromResultsList(electronicOrder.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(electronicOrder.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 7: Click "Actions" button in "Received" accordion
      ReceivingDetails.checkReceivedAccordionActionsMenuOptions([BIND_PIECES_OPTION], {
        shouldExist: false,
      });

      // Step 8: Click on the piece record in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      PieceForm.waitLoading(RECEIVING_PIECE_FORM_MODES.EDIT);
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, false, {
        disabled: true,
      });
    },
  );
});
