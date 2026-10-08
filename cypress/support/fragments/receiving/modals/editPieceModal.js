import {
  Accordion,
  Button,
  Checkbox,
  KeyValue,
  MetaSection,
  MultiColumnList,
  MultiColumnListCell,
  Pane,
  Select,
  Selection,
  TextArea,
  TextField,
  matching,
  including,
  Modal,
} from '../../../../../interactors';
import {
  RECEIVING_PIECE_FORM_ACTIONS_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUS_LOG_COLUMN_HEADERS,
} from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import ReceivingStates from '../receivingStates';
import SelectLocationModal from '../../orders/modals/selectLocationModal';
import DelayClaimModal from './delayClaimModal';
import SendClaimModal from './sendClaimModal';
import DeletePieceModal from './deletePieceModal';

const editPieceModal = Pane({ id: 'pane-title-form' });
const deleteHoldingModal = Modal({ id: 'delete-holdings-confirmation' });
const createNewHoldingForLocationButton = editPieceModal.find(
  Button('Create new holdings for location'),
);
const cancelButton = editPieceModal.find(Button('Cancel'));
const deleteButton = Button('Delete');
const quickReceiveButton = Button('Quick receive');
const saveAndCreateAnotherButton = Button('Save and create another');
const markLateButton = Button('Mark late');
const sendClaimButton = Button('Send claim');
const delayClaimButton = Button('Delay claim');
const unreceivableButton = Button('Unreceivable');
const saveAndCloseButton = editPieceModal.find(Button('Save & close'));
const actionsDropdownButton = Button({ dataTestID: 'dropdown-trigger-button' });
const unreceiveButton = Button('Unreceive');
const expectButton = Button(RECEIVING_PIECE_FORM_ACTIONS_LABELS.EXPECT);
const statusLogList = editPieceModal.find(MultiColumnList({ id: 'piece-status-change-log' }));

const editPieceFields = {
  [RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_SUMMARY]: editPieceModal.find(
    TextField({ name: 'displaySummary' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.COPY_NUMBER]: editPieceModal.find(
    TextField({ name: 'copyNumber' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.ENUMERATION]: editPieceModal.find(
    TextField({ name: 'enumeration' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.CHRONOLOGY]: editPieceModal.find(
    TextField({ name: 'chronology' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.PIECE_FORMAT]: editPieceModal.find(Select({ name: 'format' })),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.EXPECTED_RECEIPT_DATE]: editPieceModal.find(
    TextField({ name: 'receiptDate' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.COMMENT]: editPieceModal.find(TextArea({ name: 'comment' })),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.ORDER_LINE_LOCATIONS]: editPieceModal.find(
    KeyValue('Order line locations'),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.CREATE_ITEM]: editPieceModal.find(KeyValue('Create item')),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.INTERNAL_NOTE]: editPieceModal.find(
    TextArea({ name: 'internalNote' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.EXTERNAL_NOTE]: editPieceModal.find(
    TextArea({ name: 'externalNote' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_ON_HOLDING]: editPieceModal.find(
    Checkbox({ name: 'displayOnHolding' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC]: editPieceModal.find(
    Checkbox({ name: 'displayToPublic' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.BARCODE]: editPieceModal.find(TextField({ name: 'barcode' })),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.CALL_NUMBER]: editPieceModal.find(
    TextField({ name: 'callNumber' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.ACCESSION_NUMBER]: editPieceModal.find(
    TextField({ name: 'accessionNumber' }),
  ),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.ITEM_STATUS]: editPieceModal.find(KeyValue('Item status')),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.REQUEST]: editPieceModal.find(KeyValue('Request')),
  [RECEIVING_PIECE_FORM_FIELD_LABELS.SEQUENCE]: editPieceModal.find(
    TextField({ name: 'sequenceNumber' }),
  ),
};

const displayOnHoldingCheckbox =
  editPieceFields[RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_ON_HOLDING];
const displayToPublicCheckbox =
  editPieceFields[RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC];

export default {
  waitLoading() {
    cy.expect(editPieceModal.exists());
  },
  verifyModalView({ isExpected = true } = {}) {
    cy.expect([
      editPieceModal.has({
        title: 'Edit piece',
      }),
      cancelButton.has({ disabled: false, visible: true }),
      saveAndCloseButton.has({ disabled: false, visible: true }),
      Button({ dataTestID: 'dropdown-trigger-button' }).has({ disabled: false, visible: true }),
    ]);

    if (isExpected) {
      cy.expect([editPieceModal.find(Selection({ name: 'holdingId' })).exists()]);
    } else {
      cy.expect(editPieceModal.find(KeyValue('Select holdings')).exists());
    }

    Object.entries(editPieceFields).forEach(([label, field]) => {
      // Display to public only renders after Display on holding is checked, not on initial load.
      if (label !== RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC) {
        cy.expect(field.exists());
      }
    });
  },
  verifySelectedHolding(holdingName) {
    cy.expect(
      editPieceModal
        .find(Selection({ name: 'holdingId' }))
        .has({ singleValue: including(holdingName) }),
    );
  },
  selectHolding(holdingName) {
    cy.do(editPieceModal.find(Selection({ name: 'holdingId' })).choose(including(holdingName)));
  },
  verifySelectedLocation(locationName) {
    cy.expect(
      editPieceModal
        .find(TextField({ name: 'locationId' }))
        .has({ value: including(locationName) }),
    );
  },
  checkFieldsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(editPieceFields[label].has(conditions));
    });
  },
  verifyItemStatus(itemStatus) {
    cy.expect(
      editPieceModal
        .find(KeyValue(RECEIVING_PIECE_FORM_FIELD_LABELS.ITEM_STATUS))
        .has({ value: itemStatus }),
    );
  },

  fillPieceDetails(fields = {}) {
    Object.entries(fields).forEach(([label, value]) => {
      if (value === undefined) return;

      cy.do(editPieceFields[label].fillIn(value));
    });
  },

  blurField(label) {
    cy.do(editPieceFields[label].blur());
  },

  selectPieceFormat(pieceFormat) {
    cy.do(editPieceFields[RECEIVING_PIECE_FORM_FIELD_LABELS.PIECE_FORMAT].choose(pieceFormat));
  },

  checkCreateItemCheckbox() {
    const createItemCheckbox = editPieceModal.find(
      Checkbox(RECEIVING_PIECE_FORM_FIELD_LABELS.CREATE_ITEM),
    );

    cy.do(createItemCheckbox.click());
    cy.expect(createItemCheckbox.has({ checked: true }));
  },

  checkDisplayOnHoldingCheckbox() {
    cy.do(displayOnHoldingCheckbox.click());
  },

  checkDisplayToPublicCheckbox() {
    cy.do(displayToPublicCheckbox.click());
  },

  verifyCheckboxPresent(checkBoxName, shouldExist = true, disabled = false) {
    if (shouldExist) {
      cy.expect(Checkbox(checkBoxName, { disabled }).exists());
    } else {
      cy.expect(Checkbox(checkBoxName, { disabled }).absent());
    }
  },

  verifyCheckboxState(checkBoxName, checked) {
    cy.expect(Checkbox(checkBoxName).has({ checked: Boolean(checked) }));
  },

  clickCreateNewholdingsForLocation() {
    cy.do(createNewHoldingForLocationButton.click());

    SelectLocationModal.waitLoading();
    SelectLocationModal.verifyModalView();

    return SelectLocationModal;
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(editPieceModal.absent());
  },
  clickDeleteButton({ isLastPiece = true, hasItem = true } = {}) {
    cy.do(deleteButton.click());
    DeletePieceModal.waitLoading();
    DeletePieceModal.verifyModalView(isLastPiece, { hasItem });
    return DeletePieceModal;
  },
  clickQuickReceiveButton({ peiceReceived = true } = {}) {
    cy.do(quickReceiveButton.click());
    cy.do(deleteHoldingModal.find(Button('Keep Holdings')).click());

    if (peiceReceived) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(ReceivingStates.pieceReceivedSuccessfully)),
      );
    }
  },
  clickExpectButton(isSuccess = true) {
    cy.do(expectButton.click());
    if (isSuccess) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
    }
  },
  clickMarkLateButton(isSuccess = true) {
    cy.do(markLateButton.click());
    if (isSuccess) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
    }
  },
  clickUnreceivableButton(isSuccess = true) {
    cy.do(unreceivableButton.click());
    if (isSuccess) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
    }
  },
  clickSendClaimButton() {
    cy.do(sendClaimButton.click());
    SendClaimModal.waitLoading();

    return SendClaimModal;
  },
  clickDelayClaimButton() {
    cy.do(delayClaimButton.click());
    DelayClaimModal.waitLoading();

    return DelayClaimModal;
  },
  clickUnreceiveButton(isSuccess = true) {
    cy.do(unreceiveButton.click());
    if (isSuccess) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceUnreceivedSuccessfully);
    }
  },
  clickSaveAndCloseButton({ pieceSaved = true } = {}) {
    cy.do(saveAndCloseButton.click());
    if (pieceSaved) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
    }
  },
  verifySaveAndCloseButtonState({ disabled = true } = {}) {
    cy.expect(saveAndCloseButton.has({ disabled }));
  },
  verifyActionsMenuState({ disabled = true } = {}) {
    cy.expect(actionsDropdownButton.has({ disabled }));
  },
  openActionsMenu() {
    cy.do(actionsDropdownButton.click());
  },
  verifyActionsMenuOptionsStates(options = []) {
    const {
      DELAY_CLAIM,
      DELETE,
      MARK_LATE,
      QUICK_RECEIVE,
      SAVE_AND_CREATE,
      SEND_CLAIM,
      UNRECEIVABLE,
      UNRECEIVE,
    } = RECEIVING_PIECE_FORM_ACTIONS_LABELS;
    const optionButtonsMap = {
      [SAVE_AND_CREATE]: saveAndCreateAnotherButton,
      [QUICK_RECEIVE]: quickReceiveButton,
      [MARK_LATE]: markLateButton,
      [SEND_CLAIM]: sendClaimButton,
      [DELAY_CLAIM]: delayClaimButton,
      [UNRECEIVABLE]: unreceivableButton,
      [UNRECEIVE]: unreceiveButton,
      [DELETE]: deleteButton,
    };

    options.forEach(({ option, disabled }) => {
      cy.expect(optionButtonsMap[option].has({ disabled }));
    });
  },
  checkAccordionsConditions(accordions = []) {
    accordions.forEach(({ label, conditions }) => {
      cy.expect(editPieceModal.find(Accordion(label)).has(conditions));
    });
  },
  verifyMetadataAccordionState(isOpen = false) {
    cy.expect(editPieceModal.find(MetaSection()).has({ open: isOpen }));
  },
  expandAccordion(label) {
    cy.do(editPieceModal.find(Accordion(label)).clickHeader());
    cy.expect(editPieceModal.find(Accordion(label)).has({ open: true }));
  },
  checkStatusLogContent(records = []) {
    const { DATE, INTERVAL, STATUS_CHANGE, UPDATED_BY } = RECEIVING_PIECE_STATUS_LOG_COLUMN_HEADERS;

    cy.expect(statusLogList.has({ rowCount: records.length }));

    records.forEach((record, row) => {
      if (record.status) {
        cy.expect(
          statusLogList
            .find(MultiColumnListCell({ row, column: STATUS_CHANGE }))
            .has({ content: record.status }),
        );
      }
      if (record.date) {
        cy.expect(
          statusLogList
            .find(MultiColumnListCell({ row, column: DATE }))
            .has({ content: record.date }),
        );
      }
      if (record.interval) {
        cy.expect(
          statusLogList
            .find(MultiColumnListCell({ row, column: INTERVAL }))
            .has({ content: record.interval }),
        );
      }
      if (record.updatedBy) {
        cy.expect(
          statusLogList
            .find(MultiColumnListCell({ row, column: UPDATED_BY }))
            .has({ content: including(record.updatedBy) }),
        );
      }
    });
  },
  verifyUnreceiveOptionState({ disabled = true } = {}) {
    cy.do(actionsDropdownButton.click());
    cy.expect(unreceiveButton.has({ disabled }));
  },
};
