import { v4 as uuid } from 'uuid';

import {
  ORDER_FORMAT_VALUES,
  ORDER_LINE_FILTER_LABELS,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_RECEIVED_PIECE_FILTER_LABELS,
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
import { BindPiecesForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';
const BINDERY_ACTIVE_YES = 'Yes';
const BINDERY_ACTIVE_NO = 'No';
const { BINDERY_ACTIVE } = ORDER_LINE_FILTER_LABELS;
const { BOUND, NOT_BOUND } = RECEIVING_RECEIVED_PIECE_FILTER_LABELS;

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      // Both POLs have the same title, so one keyword search finds both of them
      instanceTitle: `AT_C476794_FolioInstance_${postfix}`,
      piece1: { id: uuid(), displaySummary: `AT_C476794_Piece_1_${postfix}` },
      piece2: { id: uuid(), displaySummary: `AT_C476794_Piece_2_${postfix}` },
    };
    cy.clearLocalStorage();
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

    // Order #1 with bindery active POL and Order #2 with bindery not active POL
    cy.then(() => {
      [
        { orderKey: 'binderyOrder', orderLineKey: 'binderyOrderLine', isBinderyActive: true },
        { orderKey: 'regularOrder', orderLineKey: 'regularOrderLine', isBinderyActive: false },
      ].forEach(({ orderKey, orderLineKey, isBinderyActive }) => {
        Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          testData[orderKey] = order;

          OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.defaultOrderLine,
            id: uuid(),
            purchaseOrderId: order.id,
            titleOrPackage: testData.instanceTitle,
            checkinItems: true,
            acquisitionMethod: testData.acquisitionMethod.id,
            orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
            locations: [{ locationId: testData.location.id, quantity: 2, quantityPhysical: 2 }],
            details: {
              ...BasicOrderLine.defaultOrderLine.details,
              isBinderyActive,
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
              testData[orderLineKey] = openedOrderLine;
            });
          });
        });
      });
    });

    // Two pieces are added to Order #1 title and received
    cy.then(() => {
      const { binderyOrderLine, piece1, piece2 } = testData;

      Receivings.getTitleByPoLineIdViaApi(binderyOrderLine.id).then((title) => {
        const pieceDefaults = {
          ...NewPiece.defaultPiece,
          poLineId: binderyOrderLine.id,
          titleId: title.id,
          holdingId: binderyOrderLine.locations[0].holdingId,
        };

        Pieces.upsertOrderPiecesBatchViaApi([
          { ...pieceDefaults, ...piece1 },
          { ...pieceDefaults, ...piece2 },
        ]);
      });
      cy.then(() => {
        Receivings.receivePieceViaApi({
          poLineId: binderyOrderLine.id,
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
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingEdit,
          CapabilitySets.uiInventoryInstanceView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.binderyOrder.poNumber);
      Orders.selectFromResultsList(testData.binderyOrder.poNumber);
      OrderLines.selectPOLInOrder();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    [
      [testData.binderyOrder, testData.binderyOrderLine],
      [testData.regularOrder, testData.regularOrderLine],
    ].forEach(([order, orderLine]) => {
      Orders.deleteOrderViaApi(order.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(orderLine.instanceId);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C476794 Filtering pieces in "Received" accordion by bindery status and titles using "Bindery active" facet in "Receiving" app (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C476794'] },
    () => {
      const { piece1, piece2, instanceTitle, binderyOrderLine, regularOrderLine } = testData;

      // Step 1: Click "Actions" -> "Receive" and click on the found title name on "Receiving" pane
      OrderLines.receiveOrderLineViaActions();
      Receivings.waitLoading();
      Receivings.selectFromResultsList(instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 2: Click on the first record in "Received" accordion, check "Bound" and "Save & close"
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece1.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.setBoundCheckbox(true);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedPiecesPresent([piece2.displaySummary]);

      // Step 3: Click on "Actions" button in "Received" accordion
      ReceivingDetails.assertReceivedPiecesFilterOptions([
        { label: BOUND, checked: false },
        { label: NOT_BOUND, checked: true },
      ]);

      // Step 4: Check the checkbox next to "Bound" filtering option
      ReceivingDetails.filterReceivedPiecesByOptions([BOUND]);
      ReceivingDetails.verifyReceivedRecordsCount(2);
      ReceivingDetails.checkReceivedPiecesPresent([piece1.displaySummary, piece2.displaySummary]);

      // Step 5: Click on "Actions" button in "Received" accordion
      ReceivingDetails.assertReceivedPiecesFilterOptions([
        { label: BOUND, checked: true },
        { label: NOT_BOUND, checked: true },
      ]);

      // Step 6: Uncheck the checkbox next to "Not bound" filtering option
      ReceivingDetails.filterReceivedPiecesByOptions([NOT_BOUND], { checked: false });
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedPiecesPresent([piece1.displaySummary]);

      // Step 7: Click on "Actions" button in "Received" accordion
      ReceivingDetails.assertReceivedPiecesFilterOptions([
        { label: BOUND, checked: true },
        { label: NOT_BOUND, checked: false },
      ]);

      // Step 8: Check the checkbox next to "Not bound" filtering option
      ReceivingDetails.filterReceivedPiecesByOptions([NOT_BOUND]);
      ReceivingDetails.assertReceivedPiecesFilterOptions([
        { label: BOUND, checked: true },
        { label: NOT_BOUND, checked: true },
      ]);
      ReceivingDetails.verifyReceivedRecordsCount(2);
      ReceivingDetails.checkReceivedPiecesPresent([piece1.displaySummary, piece2.displaySummary]);

      // Step 9: Click "Actions" button in "Received" accordion and select "Bind piece" option
      ReceivingDetails.clickReceivedAccordionActionsMenuOption(BIND_PIECES_OPTION);
      BindPiecesForm.waitLoading();
      BindPiecesForm.checkFormTitle(`${binderyOrderLine.poLineNumber} - ${instanceTitle}`);
      BindPiecesForm.checkPiecesCount(1);
      BindPiecesForm.checkPiecesOrder([piece2.displaySummary]);
      BindPiecesForm.checkPieceCheckboxState(piece2.displaySummary, false);

      // Step 10: Click "Cancel" button
      BindPiecesForm.clickCancelButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);

      // Step 11: Click "Reset all" button and expand "Bindery active" filtering facet
      Receivings.clearAllFilters();
      Receivings.assertCheckboxFilterValues(
        BINDERY_ACTIVE,
        [BINDERY_ACTIVE_YES, BINDERY_ACTIVE_NO],
        { checked: false },
      );
      // Search by the title of both POLs to find Order #1 and Order #2 among all titles
      Receivings.searchByParameter({ value: instanceTitle });
      Receivings.assertReceivingResults([instanceTitle, instanceTitle]);

      // Step 12: Check "Yes" option in "Bindery active" facet
      Receivings.filterByCheckboxes(BINDERY_ACTIVE, [BINDERY_ACTIVE_YES], {
        expandAccordion: false,
      });
      Receivings.assertCheckboxFilterValues(BINDERY_ACTIVE, [BINDERY_ACTIVE_YES], {
        expandAccordion: false,
      });
      Receivings.assertReceivingResults([instanceTitle]);
      Receivings.checkExistingPOLInReceivingList(binderyOrderLine.poLineNumber);

      // Step 13: Click on "x" icon next to "Bindery active" facet
      Receivings.clearFilter(BINDERY_ACTIVE);
      Receivings.assertCheckboxFilterValues(
        BINDERY_ACTIVE,
        [BINDERY_ACTIVE_YES, BINDERY_ACTIVE_NO],
        { checked: false, expandAccordion: false },
      );
      // The search query stays, so both titles are shown again
      Receivings.assertReceivingResults([instanceTitle, instanceTitle]);

      // Step 14: Check "No" option in "Bindery active" facet
      Receivings.filterByCheckboxes(BINDERY_ACTIVE, [BINDERY_ACTIVE_NO], {
        expandAccordion: false,
      });
      Receivings.assertCheckboxFilterValues(BINDERY_ACTIVE, [BINDERY_ACTIVE_NO], {
        expandAccordion: false,
      });
      Receivings.assertReceivingResults([instanceTitle]);
      Receivings.checkExistingPOLInReceivingList(regularOrderLine.poLineNumber);

      // Step 15: Check "Yes" option in "Bindery active" facet
      Receivings.filterByCheckboxes(BINDERY_ACTIVE, [BINDERY_ACTIVE_YES], {
        expandAccordion: false,
      });
      Receivings.assertCheckboxFilterValues(
        BINDERY_ACTIVE,
        [BINDERY_ACTIVE_YES, BINDERY_ACTIVE_NO],
        { expandAccordion: false },
      );
      Receivings.assertReceivingResults([instanceTitle, instanceTitle]);
      Receivings.checkExistingPOLInReceivingList(binderyOrderLine.poLineNumber);
      Receivings.checkExistingPOLInReceivingList(regularOrderLine.poLineNumber);

      // Step 16: Click "Reset all" button on "Search & filter" pane
      Receivings.clearAllFilters();
      Receivings.assertNoFiltersApplied();
    },
  );
});
