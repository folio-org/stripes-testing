import {
  Button,
  Checkbox,
  KeyValue,
  Pane,
  Select,
  Selection,
  TextArea,
  TextField,
  matching,
  Modal,
} from '../../../../../interactors';
import { RECEIVING_PIECE_FORM_FIELD_LABELS } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import ReceivingStates from '../receivingStates';
import SelectLocationModal from '../../orders/modals/selectLocationModal';
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
  [RECEIVING_PIECE_FORM_FIELD_LABELS.COMMENTS]: editPieceModal.find(TextArea({ name: 'comment' })),
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
  checkFieldsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(editPieceFields[label].has(conditions));
    });
  },

  fillPieceDetails(fields = {}) {
    Object.entries(fields).forEach(([label, value]) => {
      if (value === undefined) return;

      cy.do(editPieceFields[label].fillIn(value));
    });
  },

  checkDisplayOnHoldingCheckbox() {
    cy.do(displayOnHoldingCheckbox.click());
  },

  checkDisplayToPublicCheckbox() {
    cy.do(displayToPublicCheckbox.click());
  },

  verifyCheckboxPresent(checkBoxName, shouldExist = true) {
    if (shouldExist) {
      cy.expect(Checkbox(checkBoxName).exists());
    } else {
      cy.expect(Checkbox(checkBoxName).absent());
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
  clickDeleteButton({ isLastPiece = true } = {}) {
    cy.do(deleteButton.click());
    DeletePieceModal.waitLoading();
    DeletePieceModal.verifyModalView(isLastPiece);
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
    const optionButtonsMap = {
      'Save and create another': saveAndCreateAnotherButton,
      'Quick receive': quickReceiveButton,
      'Mark late': markLateButton,
      'Send claim': sendClaimButton,
      'Delay claim': delayClaimButton,
      Unreceivable: unreceivableButton,
      Delete: deleteButton,
    };

    options.forEach(({ option, disabled }) => {
      cy.expect(optionButtonsMap[option].has({ disabled }));
    });
  },
  verifyUnreceiveOptionState({ disabled = true } = {}) {
    cy.do(actionsDropdownButton.click());
    cy.expect(unreceiveButton.has({ disabled }));
  },
};
