import { HTML, including } from '@interactors/html';

import {
  Accordion,
  Button,
  Checkbox,
  Link,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  PaneContent,
  SearchField,
  Section,
  Select,
  TextField,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import ExportSettingsModal from './modals/exportSettingsModal';
import ReceivingDetails from './receivingDetails';

const receivingResultsSection = Section({ id: 'receiving-results-pane' });
const rootsection = PaneContent({ id: 'pane-title-details-content' });
const actionsButton = Button('Actions');
const receivingSuccessful = 'Receiving successful';
const unreceivingSuccessful = 'Unreceiving successful';
const expectedPiecesAccordionId = 'expected';
const receivedPiecesAccordionId = 'received';
const receiveButton = Button('Receive');
const unreceiveButton = Button('Unreceive');
const addPieceModal = Modal({ id: 'add-piece-modal' });
const addPieceButton = Button('Add piece');
const openedRequestModal = Modal({ id: 'data-test-opened-requests-modal' });
const selectLocationsModal = Modal('Select locations');
const pieceDetailsSection = Section({ id: 'pieceDetails' });
const filterOpenReceiving = () => {
  cy.do(Pane({ id: 'receiving-filters-pane' }).find(Button('Order status')).click());
  cy.do(Checkbox({ id: 'clickable-filter-purchaseOrder.workflowStatus-open' }).click());
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect([
      Pane({ id: 'receiving-filters-pane' }).exists(),
      Pane({ id: 'receiving-results-pane' }).exists(),
    ]);
  },
  clearSearchField() {
    cy.do(TextField({ id: 'input-record-search' }).fillIn(''));
  },
  searchByParameter({ parameter = 'Keyword', value } = {}) {
    cy.do(Select({ id: 'input-record-search-qindex' }).choose(parameter));
    cy.do(TextField({ id: 'input-record-search' }).fillIn(value));
    cy.do(Button('Search').click());
  },
  filterOpenReceiving,
  selectFromResultsList(instanceName) {
    cy.do(receivingResultsSection.find(Link(instanceName)).click());
    ReceivingDetails.waitLoading();

    return ReceivingDetails;
  },
  expandActionsDropdown() {
    cy.do(receivingResultsSection.find(actionsButton).click());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(Button(label).has(conditions));
    });
  },
  clickExportResultsToCsvButton() {
    this.expandActionsDropdown();
    cy.expect(Button('Export results (CSV)').is({ disabled: false }));
    cy.do(Button('Export results (CSV)').click());
    cy.wait(2000);
    ExportSettingsModal.verifyModalView();

    return ExportSettingsModal;
  },
  exportResultsToCsv({ confirm = true } = {}) {
    this.clickExportResultsToCsvButton();

    if (confirm) {
      ExportSettingsModal.clickExportButton();
    }
  },
  receivePiece: (rowNumber, enumeration, barcode) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      receiveButton.click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      TextField({ name: `${recievingFieldName}.enumeration` }).fillIn(enumeration),
      TextField({ name: `${recievingFieldName}.barcode` }).fillIn(barcode),
      receiveButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  receivePieceWithOnlyCopyNumber: (rowNumber, copyNumber) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      receiveButton.click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      TextField({ name: `${recievingFieldName}.copyNumber` }).fillIn(copyNumber),
      receiveButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  selectLocationInFilters: (locationName) => {
    cy.wait(4000);
    cy.do([
      Button({ id: 'accordion-toggle-button-filter-poLine.locations' }).click(),
      Button('Location look-up').click(),
      selectLocationsModal.find(SearchField({ id: 'input-record-search' })).fillIn(locationName),
      Button('Search').click(),
    ]);
    cy.wait(2000);
    cy.do([
      selectLocationsModal.find(Checkbox({ ariaLabel: 'Select all' })).click(),
      selectLocationsModal.find(Button('Save')).click(),
    ]);
  },

  checkExistingPOLInReceivingList: (POL) => {
    cy.wait(4000);
    cy.expect(receivingResultsSection.find(MultiColumnListCell(POL)).exists());
  },

  checkTitleInReceivingList: (title) => {
    cy.expect(receivingResultsSection.find(MultiColumnListCell(title)).exists());
  },

  addPiece: (displaySummary, copyNumber, enumeration, chronology) => {
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      addPieceButton.click(),
      TextField('Display summary').fillIn(displaySummary),
      TextField('Copy number').fillIn(copyNumber),
      TextField('Enumeration').fillIn(enumeration),
      TextField('Chronology').fillIn(chronology),
      Checkbox('Create item').click(),
      Button('Save & close').click(),
    ]);
    InteractorsTools.checkCalloutMessage('The piece was successfully saved');
  },

  receiveDisplayOnHoldingPiece(displaySummary) {
    cy.do([
      pieceDetailsSection.find(TextField('Display summary')).fillIn(displaySummary),
      pieceDetailsSection.find(Checkbox('Display on holding')).click(),
    ]);
    cy.expect(pieceDetailsSection.find(Checkbox('Display to public')).exists());
    this.openDropDownInEditPieceModal();
    cy.do(Button('Quick receive').click());
    cy.wait(1000);
    InteractorsTools.checkCalloutMessage('The piece  was successfully received');
  },

  editDisplayOnHoldingAndAddDisplayToPublicPiece() {
    cy.do(pieceDetailsSection.find(Checkbox('Display on holding')).click());
    cy.expect(pieceDetailsSection.find(Checkbox('Display to public')).exists());
    cy.do(pieceDetailsSection.find(Checkbox('Display to public')).click());
    cy.do(Button('Save & close').click());
    cy.wait(1000);
    InteractorsTools.checkCalloutMessage('The piece was successfully saved');
  },

  receiveWithoutDisplayOnHoldingPiece(displaySummary) {
    cy.do(pieceDetailsSection.find(TextField('Display summary')).fillIn(displaySummary));
    this.openDropDownInEditPieceModal();
    cy.do(Button('Quick receive').click());
    cy.wait(1000);
    InteractorsTools.checkCalloutMessage('The piece  was successfully received');
  },

  addPieceProcess: (caption, enumeration) => {
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      addPieceButton.click(),
      addPieceModal.find(TextField('Caption')).fillIn(caption),
      addPieceModal.find(TextField('Enumeration')).fillIn(enumeration),
    ]);
  },

  addPieceInActions: () => {
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      addPieceButton.click(),
    ]);
  },

  selectPiece: (caption) => {
    cy.do(Accordion({ id: expectedPiecesAccordionId }).find(MultiColumnListCell(caption)).click());
  },

  selectPieceInReceived: (caption) => {
    cy.do(Accordion({ id: 'received' }).find(MultiColumnListCell(caption)).click());
  },

  selectPieceByIndexInExpected: (indexNumber = 0) => {
    cy.do(
      Accordion({ id: expectedPiecesAccordionId })
        .find(MultiColumnListRow({ index: indexNumber }))
        .click(),
    );
  },

  quickReceivePiece: (enumeration) => {
    cy.do(Button('Quick receive').click());
    InteractorsTools.checkCalloutMessage(`The piece ${enumeration} was successfully received`);
  },

  quickReceivePieceFromDropdown: () => {
    cy.do(Button('Quick receive').click());
    InteractorsTools.checkCalloutMessage('The piece was successfully saved');
  },

  deleteItemPiece: () => {
    cy.do([
      Button('Delete').click(),
      Modal({ id: 'delete-piece-confirmation' }).find(Button('Delete item')).click(),
    ]);
  },

  receivePieceWithoutBarcode: (rowNumber = 0) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      receiveButton.click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      receiveButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  receivePieceWithBarcode: (rowNumber, displaySummary) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      receiveButton.click(),
    ]);
    cy.expect([
      Button('Cancel').has({ disabled: false, visible: true }),
      receiveButton.has({ disabled: true, visible: true }),
    ]);
    cy.do([
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      TextField({ name: `${recievingFieldName}.displaySummary` }).fillIn(displaySummary),
    ]);
    cy.expect(receiveButton.has({ disabled: false, visible: true }));
    cy.do(receiveButton.click());
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  receiveAndChangeLocation: (rowNumber, displaySummary, institutionId) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      receiveButton.click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      TextField({ name: `${recievingFieldName}.displaySummary` }).fillIn(displaySummary),
      MultiColumnListRow({ indexRow: `row-${rowNumber}` })
        .find(Button('Create new holdings for location'))
        .click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      selectLocationsModal
        .find(MultiColumnListCell({ content: institutionId, row: 0, columnIndex: 0 }))
        .click(),
      receiveButton.click(),
    ]);
    // Need to wait, while data will be loaded
    cy.wait(1000);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  checkReceived: (rowNumber, caption) => {
    cy.expect(
      Accordion({ id: receivedPiecesAccordionId })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: caption }))
        .exists(),
    );
  },

  checkReceivedPiece: (rowNumber = 0, barcode) => {
    // Need to wait, while data will be loaded before start checking
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);
    cy.expect([
      Accordion({ id: receivedPiecesAccordionId })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: barcode }))
        .exists(),
      Accordion({ id: expectedPiecesAccordionId })
        .find(MultiColumnListCell({ content: barcode }))
        .absent(),
    ]);
  },

  unreceivePiece: (rowNumber = 0) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: receivedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: receivedPiecesAccordionId }).find(actionsButton).click(),
      unreceiveButton.click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      unreceiveButton.click(),
    ]);
    // Need to wait, while data will be loaded
    cy.wait(1000);
    InteractorsTools.checkCalloutMessage(unreceivingSuccessful);
  },

  checkUnreceivedPiece: (caption) => {
    // Need to wait, while data will be loaded before start checking
    cy.wait(2000);
    cy.expect(
      Accordion({ id: expectedPiecesAccordionId })
        .find(MultiColumnListCell({ content: caption }))
        .exists(),
    );
  },

  checkIsPiecesCreated: (title) => {
    cy.wait(1000);
    cy.expect(
      Pane('Receiving')
        .find(MultiColumnList({ id: 'receivings-list' }))
        .find(MultiColumnListCell({ content: title }))
        .exists(),
    );
  },

  selectReceivingItem: () => {
    cy.do(receivingResultsSection.find(Button({ href: including('/receiving') })).click());
  },

  selectInstanceInReceive: () => {
    cy.get('[data-testid="titleInstanceLink"]').click();
    cy.wait(6000);
  },

  selectPOLineInReceive: () => {
    cy.get('[data-testid="titlePOLineLink"]').click();
    cy.wait(6000);
  },

  selectInstanceLinkInReceive: () => {
    cy.do(Section({ id: 'pane-title-details' }).find(Link()).click());
  },

  selectPOLInReceive: (POLName) => {
    cy.do(receivingResultsSection.find(Link(POLName)).click());
  },

  selectConnectedInEditPiece: () => {
    cy.do(Link('Connected').click());
  },

  receiveFromExpectedSection: () => {
    cy.do([Section({ id: 'expected' }).find(actionsButton).click(), receiveButton.click()]);
  },

  selectRecordInExpectedList: (rowNumber = 0) => {
    cy.do(
      Section({ id: 'expected' })
        .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
        .click(),
    );
  },

  varifyExpectedListIsEmpty: () => {
    cy.expect(Section({ id: 'expected' }).find(MultiColumnListRow()).absent());
  },

  selectRecordInReceivedList: (rowNumber = 0) => {
    cy.do(
      Section({ id: 'received' })
        .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
        .click(),
    );
  },

  varifyReceivedListIsEmpty: () => {
    cy.expect(Section({ id: 'received' }).find(MultiColumnListRow()).absent());
  },

  openDropDownInEditPieceModal: () => {
    cy.do(Button({ dataTestID: 'dropdown-trigger-button' }).click());
  },

  quickReceiveInEditPieceModal() {
    this.openDropDownInEditPieceModal();
    cy.do(Button('Quick receive').click());
    InteractorsTools.checkCalloutMessage('The piece  was successfully received');
  },

  unreceiveInEditPieceModal() {
    this.openDropDownInEditPieceModal();
    cy.do(Button('Unreceive').click());
    InteractorsTools.checkCalloutMessage('Unreceiving successful');
  },

  receiveFromExpectedSectionWithClosePOL: () => {
    cy.do([
      Section({ id: 'expected' }).find(actionsButton).click(),
      receiveButton.click(),
      Button('Continue').click(),
    ]);
  },

  unreceiveFromReceivedSection: () => {
    cy.do([Section({ id: 'received' }).find(actionsButton).click(), unreceiveButton.click()]);
  },

  selectLinkFromResultsList: () => {
    cy.do(MultiColumnList({ id: 'receivings-list' }).find(Link()).click());
  },

  receiveAll: () => {
    cy.do([Checkbox({ ariaLabel: 'Select all pieces' }).clickInput(), receiveButton.click()]);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  clickOnInstance: () => {
    cy.do([Button('Collapse all').click(), rootsection.find(Link()).click()]);
  },

  clickOnPOLnumber: (PolNumber) => {
    cy.do([rootsection.find(Link(PolNumber)).click()]);
  },

  quickReceivePieceAdd: () => {
    cy.do(Button('Quick receive').click());
    cy.wait(4000);
  },

  fillInCopyNumberInAddPieceModal: (copynumber) => {
    cy.wait(4000);
    cy.do(TextField({ name: 'copyNumber' }).fillIn(copynumber));
  },

  receiveAllPhysicalItemsWithBarcodes: (firstBarcode, secondBarcode) => {
    cy.do([
      Checkbox({ name: 'receivedItems[0].checked' }).clickInput(),
      TextField({ name: 'receivedItems[0].barcode' }).fillIn(firstBarcode),
      Checkbox({ name: 'receivedItems[1].checked' }).clickInput(),
      TextField({ name: 'receivedItems[1].barcode' }).fillIn(secondBarcode),
      receiveButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  verifyDetailsOpened: () => {
    cy.expect([rootsection.exists(), Accordion({ id: expectedPiecesAccordionId }).exists()]);
  },

  verifyRequestIsCreated: () => {
    cy.expect(
      Accordion({ id: expectedPiecesAccordionId })
        .find(MultiColumnListCell({ columnIndex: 11, content: 'Yes' }))
        .exists(),
    );
  },

  verifyOpenedRequestsModal: (inctanceTitle, itemBarcode) => {
    cy.expect([
      openedRequestModal.exists(),
      openedRequestModal.find(HTML(including('The following item has an open request'))).exists(),
      openedRequestModal.find(HTML(including(`${inctanceTitle}:`))).exists(),
      openedRequestModal.find(HTML(including(`Barcode (${itemBarcode})`))).exists(),
      openedRequestModal.find(Button('Close')).has({ disabled: false, visible: true }),
    ]);
  },

  closeOpenedRequestModal: () => {
    cy.do(openedRequestModal.find(Button('Close')).click());
    cy.expect(openedRequestModal.absent());
  },

  varifyAddingRoutingList: (name) => {
    cy.expect(Section({ id: 'routing-list' }).find(MultiColumnListCell(name)).exists());
  },

  openRoutingListsSection: () => {
    cy.do(Button({ id: 'accordion-toggle-button-routing-list' }).click());
  },

  addRoutingListExist: () => {
    cy.expect(Button('Add routing list').exists());
  },

  getPiecesViaApi(poLineId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'orders/pieces',
        searchParams: {
          query: `poLineId==${poLineId}`,
        },
      })
      .then(({ body }) => body?.pieces || []);
  },

  receivePieceViaApi({ poLineId, pieces, tenantId }) {
    return this.getPiecesViaApi(poLineId).then((allPieces) => {
      const checkInPieces = pieces.map((currentPiece) => {
        const piece = allPieces.find((p) => p.id === currentPiece.id);

        return {
          // receiveToNewHolding is used to receive a piece into a new holding
          // if true, a new holding will be created at the specified location
          id: piece.id,
          holdingId: currentPiece.receiveToNewHolding ? null : piece.holdingId,
          locationId: currentPiece.receiveToNewHolding ? currentPiece.locationId : piece.locationId,
          accessionNumber: currentPiece.accessionNumber || piece.accessionNumber,
          barcode: currentPiece.barcode || piece.barcode,
          callNumber: currentPiece.callNumber || piece.callNumber,
          chronology: currentPiece.chronology || piece.chronology,
          comment: currentPiece.comment || piece.comment,
          copyNumber: currentPiece.copyNumber || piece.copyNumber,
          enumeration: currentPiece.enumeration || piece.enumeration,
          displaySummary: currentPiece.displaySummary || piece.displaySummary,
          displayOnHolding:
            currentPiece.displayOnHolding !== undefined
              ? currentPiece.displayOnHolding
              : piece.displayOnHolding,
          displayToPublic:
            currentPiece.displayToPublic !== undefined
              ? currentPiece.displayToPublic
              : piece.displayToPublic,
          receiptDate: currentPiece.receiptDate || piece.receiptDate,
          sequenceNumber: piece.sequenceNumber,
          supplement:
            currentPiece.supplement !== undefined ? currentPiece.supplement : piece.supplement,
          ...(tenantId || currentPiece.receivingTenantId
            ? { receivingTenantId: tenantId || currentPiece.receivingTenantId }
            : {}),
        };
      });

      return cy.okapiRequest({
        method: 'POST',
        path: 'orders/check-in',
        body: {
          toBeCheckedIn: [{ poLineId, checkedIn: checkInPieces.length, checkInPieces }],
          totalRecords: checkInPieces.length,
        },
        isDefaultSearchParamsRequired: false,
      });
    });
  },

  getTitleByPoLineNumberViaApi(poLineNumber) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'orders/titles',
        searchParams: {
          query: `(((poLine.poLineNumber==*${poLineNumber}*)))`,
        },
      })
      .then(({ body }) => body?.titles?.[0]);
  },

  parsePOLformatToPieceFormat(format) {
    switch (format) {
      case 'Physical Resource':
        return 'Physical';
      case 'Electronic Resource':
        return 'Electronic';
      case 'P/E Mix':
        return 'Physical';
      case 'Other':
        return 'Other';
      default:
        return 'Physical';
    }
  },

  addPieceViaApi(
    { poLineId, poLineNumber, format, holdingId, searchParams = {} },
    otherParams = {},
  ) {
    return this.getTitleByPoLineNumberViaApi(poLineNumber).then((titleResponse) => {
      const titleId = titleResponse.id;
      const sequenceNumber = titleResponse.sequenceNumber;
      return cy.okapiRequest({
        method: 'POST',
        path: 'orders/pieces',
        searchParams,
        isDefaultSearchParamsRequired: false,
        body: {
          poLineId,
          titleId,
          format: this.parsePOLformatToPieceFormat(format),
          holdingId: holdingId || null,
          sequenceNumber,
          receiptDate: titleResponse.expectedReceiptDate ? titleResponse.expectedReceiptDate : '',
          ...otherParams,
        },
      });
    });
  },

  getTitleByPoLineIdViaApi(poLineId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'orders/titles',
        searchParams: {
          query: `poLineId==${poLineId}`,
        },
      })
      .then(({ body }) => (body?.titles?.length > 0 ? body.titles[0] : null));
  },

  updateTitleViaApi(title) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `orders/titles/${title.id}`,
      body: title,
    });
  },
};
