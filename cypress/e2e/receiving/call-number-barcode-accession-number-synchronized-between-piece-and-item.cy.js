import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  INVENTORY_ITEMS,
  NO_VALUE,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import {
  InventoryInstances,
  InventoryItems,
  ItemRecordEdit,
  ItemRecordView,
} from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { PieceForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const {
  ACCESSION_NUMBER,
  BARCODE,
  CALL_NUMBER,
  CHRONOLOGY,
  COPY_NUMBER,
  DISPLAY_SUMMARY,
  ENUMERATION,
} = RECEIVING_PIECE_FORM_FIELD_LABELS;

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C959222_Organization_${postfix}`,
      },
      instanceTitle: `AT_C959222_FolioInstance_${postfix}`,
      expectedPiece: {
        displaySummary: `AT_C959222_ExpectedPiece_DisplaySummary_${postfix}`,
        copyNumber: `AT_C959222_ExpectedPiece_CopyNumber_${postfix}`,
        enumeration: `AT_C959222_ExpectedPiece_Enumeration_${postfix}`,
        chronology: `AT_C959222_ExpectedPiece_Chronology_${postfix}`,
        barcode: `AT_C959222_ExpectedPiece_Barcode_${postfix}`,
        callNumber: `AT_C959222_ExpectedPiece_CallNumber_${postfix}`,
        accessionNumber: `AT_C959222_ExpectedPiece_AccessionNumber_${postfix}`,
      },
      editedExpectedPiece: {
        displaySummary: `AT_C959222_ExpectedPiece_Edited_DisplaySummary_${postfix}`,
        copyNumber: `AT_C959222_ExpectedPiece_Edited_CopyNumber_${postfix}`,
        enumeration: `AT_C959222_ExpectedPiece_Edited_Enumeration_${postfix}`,
        chronology: `AT_C959222_ExpectedPiece_Edited_Chronology_${postfix}`,
        barcode: `AT_C959222_ExpectedPiece_Edited_Barcode_${postfix}`,
        callNumber: `AT_C959222_ExpectedPiece_Edited_CallNumber_${postfix}`,
        accessionNumber: `AT_C959222_ExpectedPiece_Edited_AccessionNumber_${postfix}`,
      },
      editedExpectedPieceItem: {
        displaySummary: `AT_C959222_ExpectedPieceItem_Edited_DisplaySummary_${postfix}`,
        copyNumber: `AT_C959222_ExpectedPieceItem_Edited_CopyNumber_${postfix}`,
        enumeration: `AT_C959222_ExpectedPieceItem_Edited_Enumeration_${postfix}`,
        chronology: `AT_C959222_ExpectedPieceItem_Edited_Chronology_${postfix}`,
        barcode: `AT_C959222_ExpectedPieceItem_Edited_Barcode_${postfix}`,
        callNumber: `AT_C959222_ExpectedPieceItem_Edited_CallNumber_${postfix}`,
        accessionNumber: `AT_C959222_ExpectedPieceItem_Edited_AccessionNumber_${postfix}`,
      },
      receivedPieceItem: {
        displaySummary: `AT_C959222_ReceivedPieceItem_DisplaySummary_${postfix}`,
        copyNumber: `AT_C959222_ReceivedPieceItem_CopyNumber_${postfix}`,
        enumeration: `AT_C959222_ReceivedPieceItem_Enumeration_${postfix}`,
        chronology: `AT_C959222_ReceivedPieceItem_Chronology_${postfix}`,
        barcode: `AT_C959222_ReceivedPieceItem_Barcode_${postfix}`,
        callNumber: `AT_C959222_ReceivedPieceItem_CallNumber_${postfix}`,
        accessionNumber: `AT_C959222_ReceivedPieceItem_AccessionNumber_${postfix}`,
      },
      editedReceivedPiece: {
        displaySummary: `AT_C959222_ReceivedPiece_Edited_DisplaySummary_${postfix}`,
        copyNumber: `AT_C959222_ReceivedPiece_Edited_CopyNumber_${postfix}`,
        enumeration: `AT_C959222_ReceivedPiece_Edited_Enumeration_${postfix}`,
        chronology: `AT_C959222_ReceivedPiece_Edited_Chronology_${postfix}`,
        barcode: `AT_C959222_ReceivedPiece_Edited_Barcode_${postfix}`,
        callNumber: `AT_C959222_ReceivedPiece_Edited_CallNumber_${postfix}`,
        accessionNumber: `AT_C959222_ReceivedPiece_Edited_AccessionNumber_${postfix}`,
      },
      refilledReceivedPiece: {
        displaySummary: `AT_C959222_ReceivedPiece_Refilled_DisplaySummary_${postfix}`,
        copyNumber: `AT_C959222_ReceivedPiece_Refilled_CopyNumber_${postfix}`,
        enumeration: `AT_C959222_ReceivedPiece_Refilled_Enumeration_${postfix}`,
        chronology: `AT_C959222_ReceivedPiece_Refilled_Chronology_${postfix}`,
        barcode: `AT_C959222_ReceivedPiece_Refilled_Barcode_${postfix}`,
        callNumber: `AT_C959222_ReceivedPiece_Refilled_CallNumber_${postfix}`,
        accessionNumber: `AT_C959222_ReceivedPiece_Refilled_AccessionNumber_${postfix}`,
      },
      unreceivablePieceAccessionNumber: `AT_C959222_UnreceivablePiece_AccessionNumber_${postfix}`,
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
          // Receiving workflow: Synchronized order and receipt quantity
          checkinItems: false,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.location.id, quantity: 2, quantityPhysical: 2 }],
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

    // Piece #1 stays expected with all fields filled; Piece #2 is received without populated fields,
    // and its item has all fields filled
    cy.then(() => {
      Pieces.getOrderPiecesViaApi({ query: `poLineId==${testData.orderLine.id}` }).then(
        ({ pieces: [expectedPiece, receivedPiece] }) => {
          Pieces.updateOrderPieceViaApi({ ...expectedPiece, ...testData.expectedPiece });
          Receivings.receivePieceViaApi({
            poLineId: testData.orderLine.id,
            pieces: [{ id: receivedPiece.id }],
          });
          cy.then(() => {
            const { callNumber, ...itemFields } = testData.receivedPieceItem;

            InventoryItems.getItemByIdViaApi(receivedPiece.itemId).then((item) => {
              InventoryItems.editItemViaApi({
                ...item,
                ...itemFields,
                itemLevelCallNumber: callNumber,
              });
            });
          });
        },
      );
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingEdit,
          CapabilitySets.uiInventory,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C959222 Fields for call number, barcode, and accession number are synchronized between piece and item (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C959222'] },
    () => {
      const {
        instanceTitle,
        expectedPiece,
        editedExpectedPiece,
        editedExpectedPieceItem,
        receivedPieceItem,
        editedReceivedPiece,
        refilledReceivedPiece,
        unreceivablePieceAccessionNumber,
      } = testData;

      // Step 1: Search for the title and click on its record
      Receivings.searchByParameter({ value: instanceTitle });
      Receivings.selectFromResultsList(instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkExpectedTableContent([
        {
          displaySummary: expectedPiece.displaySummary,
          copyNumber: expectedPiece.copyNumber,
          enumeration: expectedPiece.enumeration,
          chronology: expectedPiece.chronology,
        },
      ]);
      ReceivingDetails.checkReceivedTableContent([{ barcode: receivedPieceItem.barcode }]);

      // Step 2: Click on the record in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: DISPLAY_SUMMARY, conditions: { value: expectedPiece.displaySummary } },
        { label: COPY_NUMBER, conditions: { value: expectedPiece.copyNumber } },
        { label: ENUMERATION, conditions: { value: expectedPiece.enumeration } },
        { label: CHRONOLOGY, conditions: { value: expectedPiece.chronology } },
        { label: BARCODE, conditions: { value: expectedPiece.barcode } },
        { label: CALL_NUMBER, conditions: { value: expectedPiece.callNumber } },
        { label: ACCESSION_NUMBER, conditions: { value: expectedPiece.accessionNumber } },
      ]);

      // Step 3: Edit the fields and click "Save & close"
      EditPieceModal.fillPieceDetails({
        [DISPLAY_SUMMARY]: editedExpectedPiece.displaySummary,
        [COPY_NUMBER]: editedExpectedPiece.copyNumber,
        [ENUMERATION]: editedExpectedPiece.enumeration,
        [CHRONOLOGY]: editedExpectedPiece.chronology,
        [BARCODE]: editedExpectedPiece.barcode,
        [CALL_NUMBER]: editedExpectedPiece.callNumber,
        [ACCESSION_NUMBER]: editedExpectedPiece.accessionNumber,
      });
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.checkExpectedTableContent([
        {
          displaySummary: editedExpectedPiece.displaySummary,
          copyNumber: editedExpectedPiece.copyNumber,
          enumeration: editedExpectedPiece.enumeration,
          chronology: editedExpectedPiece.chronology,
        },
      ]);

      // Step 4: Open the piece and click "Connected" link, the item has the edited values
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: editedExpectedPiece.barcode } },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: editedExpectedPiece.accessionNumber },
          },
        ],
        itemData: [
          {
            label: INVENTORY_ITEMS.COPY_NUMBER,
            conditions: { value: editedExpectedPiece.copyNumber },
          },
          {
            label: INVENTORY_ITEMS.CALL_NUMBER,
            conditions: { value: editedExpectedPiece.callNumber },
          },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: editedExpectedPiece.displaySummary },
          },
          {
            label: INVENTORY_ITEMS.ENUMERATION,
            conditions: { value: editedExpectedPiece.enumeration },
          },
          {
            label: INVENTORY_ITEMS.CHRONOLOGY,
            conditions: { value: editedExpectedPiece.chronology },
          },
        ],
      });

      // Step 5: Edit the item fields and click "Save & close"
      ItemRecordView.openItemEditForm(instanceTitle);
      ItemRecordEdit.fillItemRecordFields(editedExpectedPieceItem);
      ItemRecordEdit.saveAndClose({ itemSaved: true });
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          {
            label: INVENTORY_ITEMS.BARCODE,
            conditions: { value: editedExpectedPieceItem.barcode },
          },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: editedExpectedPieceItem.accessionNumber },
          },
        ],
        itemData: [
          {
            label: INVENTORY_ITEMS.COPY_NUMBER,
            conditions: { value: editedExpectedPieceItem.copyNumber },
          },
          {
            label: INVENTORY_ITEMS.CALL_NUMBER,
            conditions: { value: editedExpectedPieceItem.callNumber },
          },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: editedExpectedPieceItem.displaySummary },
          },
          {
            label: INVENTORY_ITEMS.ENUMERATION,
            conditions: { value: editedExpectedPieceItem.enumeration },
          },
          {
            label: INVENTORY_ITEMS.CHRONOLOGY,
            conditions: { value: editedExpectedPieceItem.chronology },
          },
        ],
      });

      // Step 6: Go back to "Receiving", the "Edit piece" form of the expected piece reopens:
      // "Piece details" keep the piece values, "Item details" are updated from the item
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: DISPLAY_SUMMARY, conditions: { value: editedExpectedPiece.displaySummary } },
        { label: COPY_NUMBER, conditions: { value: editedExpectedPiece.copyNumber } },
        { label: ENUMERATION, conditions: { value: editedExpectedPiece.enumeration } },
        { label: CHRONOLOGY, conditions: { value: editedExpectedPiece.chronology } },
        { label: BARCODE, conditions: { value: editedExpectedPieceItem.barcode } },
        { label: CALL_NUMBER, conditions: { value: editedExpectedPieceItem.callNumber } },
        {
          label: ACCESSION_NUMBER,
          conditions: { value: editedExpectedPieceItem.accessionNumber },
        },
      ]);

      // Step 7: Close the form and open the record in "Received" accordion:
      // "Piece details" are not populated from the item, "Item details" are populated from the item
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openEditPieceModal({ section: 'Received' });
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: DISPLAY_SUMMARY, conditions: { value: '' } },
        { label: COPY_NUMBER, conditions: { value: '' } },
        { label: ENUMERATION, conditions: { value: '' } },
        { label: CHRONOLOGY, conditions: { value: '' } },
        { label: BARCODE, conditions: { value: receivedPieceItem.barcode } },
        { label: CALL_NUMBER, conditions: { value: receivedPieceItem.callNumber } },
        { label: ACCESSION_NUMBER, conditions: { value: receivedPieceItem.accessionNumber } },
      ]);

      // Step 8: Edit the fields and click "Save & close"
      EditPieceModal.fillPieceDetails({
        [DISPLAY_SUMMARY]: editedReceivedPiece.displaySummary,
        [COPY_NUMBER]: editedReceivedPiece.copyNumber,
        [ENUMERATION]: editedReceivedPiece.enumeration,
        [CHRONOLOGY]: editedReceivedPiece.chronology,
        [BARCODE]: editedReceivedPiece.barcode,
        [CALL_NUMBER]: editedReceivedPiece.callNumber,
        [ACCESSION_NUMBER]: editedReceivedPiece.accessionNumber,
      });
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.checkReceivedTableContent([
        {
          displaySummary: editedReceivedPiece.displaySummary,
          copyNumber: editedReceivedPiece.copyNumber,
          enumeration: editedReceivedPiece.enumeration,
          chronology: editedReceivedPiece.chronology,
          barcode: editedReceivedPiece.barcode,
        },
      ]);

      // Step 9: Open the received piece and click "Connected" link, the item has the edited values
      ReceivingDetails.openEditPieceModal({ section: 'Received' });
      EditPieceModal.waitLoading();
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: editedReceivedPiece.barcode } },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: editedReceivedPiece.accessionNumber },
          },
        ],
        itemData: [
          {
            label: INVENTORY_ITEMS.COPY_NUMBER,
            conditions: { value: editedReceivedPiece.copyNumber },
          },
          {
            label: INVENTORY_ITEMS.CALL_NUMBER,
            conditions: { value: editedReceivedPiece.callNumber },
          },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: editedReceivedPiece.displaySummary },
          },
          {
            label: INVENTORY_ITEMS.ENUMERATION,
            conditions: { value: editedReceivedPiece.enumeration },
          },
          {
            label: INVENTORY_ITEMS.CHRONOLOGY,
            conditions: { value: editedReceivedPiece.chronology },
          },
        ],
      });

      // Step 10: Clear the item fields and click "Save & close"
      ItemRecordView.openItemEditForm(instanceTitle);
      ItemRecordEdit.clearItemRecordFields([
        'displaySummary',
        'copyNumber',
        'enumeration',
        'chronology',
        'barcode',
        'callNumber',
        'accessionNumber',
      ]);
      ItemRecordEdit.saveAndClose({ itemSaved: true });
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: NO_VALUE } },
          { label: INVENTORY_ITEMS.ACCESSION_NUMBER, conditions: { value: NO_VALUE } },
        ],
        itemData: [
          { label: INVENTORY_ITEMS.COPY_NUMBER, conditions: { value: NO_VALUE } },
          { label: INVENTORY_ITEMS.CALL_NUMBER, conditions: { value: NO_VALUE } },
        ],
        enumerationData: [
          { label: INVENTORY_ITEMS.DISPLAY_SUMMARY, conditions: { value: NO_VALUE } },
          { label: INVENTORY_ITEMS.ENUMERATION, conditions: { value: NO_VALUE } },
          { label: INVENTORY_ITEMS.CHRONOLOGY, conditions: { value: NO_VALUE } },
        ],
      });

      // Step 11: Go back to "Receiving", the "Edit piece" form of the received piece reopens:
      // "Piece details" are not cleared, "Item details" are cleared
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: DISPLAY_SUMMARY, conditions: { value: editedReceivedPiece.displaySummary } },
        { label: COPY_NUMBER, conditions: { value: editedReceivedPiece.copyNumber } },
        { label: ENUMERATION, conditions: { value: editedReceivedPiece.enumeration } },
        { label: CHRONOLOGY, conditions: { value: editedReceivedPiece.chronology } },
        { label: BARCODE, conditions: { value: '' } },
        { label: CALL_NUMBER, conditions: { value: '' } },
        { label: ACCESSION_NUMBER, conditions: { value: '' } },
      ]);

      // Step 12: Fill in the fields and unreceive the piece
      EditPieceModal.fillPieceDetails({
        [DISPLAY_SUMMARY]: refilledReceivedPiece.displaySummary,
        [COPY_NUMBER]: refilledReceivedPiece.copyNumber,
        [ENUMERATION]: refilledReceivedPiece.enumeration,
        [CHRONOLOGY]: refilledReceivedPiece.chronology,
        [BARCODE]: refilledReceivedPiece.barcode,
        [CALL_NUMBER]: refilledReceivedPiece.callNumber,
        [ACCESSION_NUMBER]: refilledReceivedPiece.accessionNumber,
      });
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickUnreceiveButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.getExpectedRowIndexByContent(refilledReceivedPiece.displaySummary).then(
        (rowIndex) => {
          ReceivingDetails.checkExpectedTableContent([
            {
              rowIndex,
              displaySummary: refilledReceivedPiece.displaySummary,
              copyNumber: refilledReceivedPiece.copyNumber,
              enumeration: refilledReceivedPiece.enumeration,
              chronology: refilledReceivedPiece.chronology,
            },
          ]);
        },
      );

      // Step 13: Click on the just edited piece in "Expected" accordion
      ReceivingDetails.openEditPieceModal({ displaySummary: refilledReceivedPiece.displaySummary });
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: DISPLAY_SUMMARY, conditions: { value: refilledReceivedPiece.displaySummary } },
        { label: COPY_NUMBER, conditions: { value: refilledReceivedPiece.copyNumber } },
        { label: ENUMERATION, conditions: { value: refilledReceivedPiece.enumeration } },
        { label: CHRONOLOGY, conditions: { value: refilledReceivedPiece.chronology } },
        { label: BARCODE, conditions: { value: refilledReceivedPiece.barcode } },
        { label: CALL_NUMBER, conditions: { value: refilledReceivedPiece.callNumber } },
        {
          label: ACCESSION_NUMBER,
          conditions: { value: refilledReceivedPiece.accessionNumber },
        },
      ]);

      // Step 14: Click "Connected" link, the item has the edited values
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          {
            label: INVENTORY_ITEMS.BARCODE,
            conditions: { value: refilledReceivedPiece.barcode },
          },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: refilledReceivedPiece.accessionNumber },
          },
        ],
        itemData: [
          {
            label: INVENTORY_ITEMS.COPY_NUMBER,
            conditions: { value: refilledReceivedPiece.copyNumber },
          },
          {
            label: INVENTORY_ITEMS.CALL_NUMBER,
            conditions: { value: refilledReceivedPiece.callNumber },
          },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: refilledReceivedPiece.displaySummary },
          },
          {
            label: INVENTORY_ITEMS.ENUMERATION,
            conditions: { value: refilledReceivedPiece.enumeration },
          },
          {
            label: INVENTORY_ITEMS.CHRONOLOGY,
            conditions: { value: refilledReceivedPiece.chronology },
          },
        ],
      });

      // Step 15: Clear "Accession number" of the item and click "Save & close"
      ItemRecordView.openItemEditForm(instanceTitle);
      ItemRecordEdit.clearItemRecordFields(['accessionNumber']);
      ItemRecordEdit.saveAndClose({ itemSaved: true });
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.ACCESSION_NUMBER, conditions: { value: NO_VALUE } },
        ],
      });

      // Step 16: Go back to "Receiving", the "Edit piece" form of the piece reopens:
      // only "Accession number" is cleared
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: DISPLAY_SUMMARY, conditions: { value: refilledReceivedPiece.displaySummary } },
        { label: COPY_NUMBER, conditions: { value: refilledReceivedPiece.copyNumber } },
        { label: ENUMERATION, conditions: { value: refilledReceivedPiece.enumeration } },
        { label: CHRONOLOGY, conditions: { value: refilledReceivedPiece.chronology } },
        { label: BARCODE, conditions: { value: refilledReceivedPiece.barcode } },
        { label: CALL_NUMBER, conditions: { value: refilledReceivedPiece.callNumber } },
        { label: ACCESSION_NUMBER, conditions: { value: '' } },
      ]);

      // Step 17: Clear "Barcode" and "Call number", fill in "Accession number", mark as unreceivable
      EditPieceModal.fillPieceDetails({
        [BARCODE]: '',
        [CALL_NUMBER]: '',
        [ACCESSION_NUMBER]: unreceivablePieceAccessionNumber,
      });
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickUnreceivableButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);
      ReceivingDetails.checkUnreceivableTableContent([
        { displaySummary: refilledReceivedPiece.displaySummary, barcode: NO_VALUE },
      ]);

      // Step 18: Click on the piece in "Unreceivable" accordion
      ReceivingDetails.openEditPieceModal({
        section: 'Unreceivable',
        displaySummary: refilledReceivedPiece.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: BARCODE, conditions: { value: '' } },
        { label: CALL_NUMBER, conditions: { value: '' } },
        { label: ACCESSION_NUMBER, conditions: { value: unreceivablePieceAccessionNumber } },
      ]);

      // Step 19: Click "Connected" link, barcode and call number are blank, accession number is edited
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: NO_VALUE } },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: unreceivablePieceAccessionNumber },
          },
        ],
        itemData: [{ label: INVENTORY_ITEMS.CALL_NUMBER, conditions: { value: NO_VALUE } }],
      });
    },
  );
});
