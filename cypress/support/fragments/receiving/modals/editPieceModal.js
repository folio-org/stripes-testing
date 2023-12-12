import {
  Button,
  Label,
  Modal,
  Select,
  Selection,
  TextArea,
  TextField,
  matching,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import ReceivingStates from '../receivingStates';
import SelectLocationModal from '../../orders/modals/selectLocationModal';

const editPieceModal = Modal({ id: 'add-piece-modal' });
const createNewHoldingForLocationButton = editPieceModal.find(
  Button('Create new holdings for location'),
);
const cancelButton = editPieceModal.find(Button('Cancel'));
const deleteButton = editPieceModal.find(Button('Delete'));
const quickReceiveButton = editPieceModal.find(Button('Quick receive'));
const saveAndCloseButton = editPieceModal.find(Button('Save & close'));

const editPieceFields = {
  Caption: editPieceModal.find(TextField({ name: 'caption' })),
  'Copy number': editPieceModal.find(TextField({ name: 'copyNumber' })),
  Enumeration: editPieceModal.find(TextField({ name: 'enumeration' })),
  Chronology: editPieceModal.find(TextField({ name: 'chronology' })),
  'Piece format': editPieceModal.find(Select({ name: 'format' })),
  'Expected receipt date': editPieceModal.find(TextField({ name: 'receiptDate' })),
  Comment: editPieceModal.find(TextArea({ name: 'comment' })),
  'Order line locations': editPieceModal.find(Label('Order line locations')),
  'Name (code)': editPieceModal.find(Selection({ name: 'holdingId' })),
};

export default {
  waitLoading() {
    cy.expect(editPieceModal.exists());
  },
  verifyModalView() {
    cy.expect([
      editPieceModal.has({
        header: 'Edit piece',
      }),
      cancelButton.has({ disabled: false, visible: true }),
      deleteButton.has({ disabled: false, visible: true }),
      quickReceiveButton.has({ disabled: false, visible: true }),
      saveAndCloseButton.has({ disabled: false, visible: true }),
    ]);

    Object.values(editPieceFields).forEach((field) => cy.expect(field.exists()));
  },
  checkFieldsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(editPieceFields[label].has(conditions));
    });
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
  clickQuickReceiveButton({ peiceReceived = true } = {}) {
    cy.expect(quickReceiveButton.has({ disabled: false }));
    cy.do(quickReceiveButton.click());

    if (peiceReceived) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(ReceivingStates.pieceReceivedSuccessfully)),
      );
    }
  },
  clickSaveAndCloseButton({ pieceSaved = true } = {}) {
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());

    if (pieceSaved) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
    }
  },
};
