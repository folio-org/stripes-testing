import {
  Button,
  KeyValue,
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
import DeletePieceModal from './deletePieceModal';

const editPieceModal = Modal({ id: 'add-piece-modal' });
const createNewHoldingForLocationButton = editPieceModal.find(
  Button('Create new holdings for location'),
);
const cancelButton = editPieceModal.find(Button('Cancel'));
const deleteButton = Button('Delete');
const quickReceiveButton = Button('Quick receive');
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
  'Create item': editPieceModal.find(KeyValue('Create item')),
};

export default {
  waitLoading() {
    cy.expect(editPieceModal.exists());
  },
  verifyModalView({ isExpected = true } = {}) {
    cy.expect([
      editPieceModal.has({
        header: 'Edit piece',
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
  clickDeleteButton() {
    cy.do(deleteButton.click());
    DeletePieceModal.waitLoading();
    DeletePieceModal.verifyModalView();

    return DeletePieceModal;
  },
  clickQuickReceiveButton({ peiceReceived = true } = {}) {
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
