import { Button, Datepicker, HTML, Modal, TextArea, including } from '../../../../../interactors';
import { COMMON_BUTTON_LABELS, RECEIVING_PIECE_FORM_ACTIONS_LABELS } from '../../../constants';

const RECEIVING_PIECE_CLAIM_MODAL_FIELD_LABELS = {
  CLAIM_EXPIRY_DATE: 'Claim expiry date',
  EXTERNAL_NOTE: 'External note',
  INTERNAL_NOTE: 'Internal note',
};

const SEND_CLAIM_MESSAGES = {
  WITH_INTEGRATION:
    'This will generate a claim job which can be viewed in Export manager. Continue?',
  WITHOUT_INTEGRATION:
    'No claiming integration exists for this organization. Piece will be set to "Claim sent" status. Continue?',
};

const sendClaimModal = Modal({ id: 'send-claim-modal' });
const claimExpiryDateField = sendClaimModal.find(Datepicker());
const internalNoteField = sendClaimModal.find(TextArea({ name: 'internalNote' }));
const externalNoteField = sendClaimModal.find(TextArea({ name: 'externalNote' }));
const cancelButton = sendClaimModal.find(Button(COMMON_BUTTON_LABELS.CANCEL));
const saveAndCloseButton = sendClaimModal.find(Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE));

export default {
  waitLoading() {
    cy.expect(sendClaimModal.exists());
  },
  // The message depends on whether the organization has a claiming integration
  verifyModalView({ hasIntegration = false } = {}) {
    const { WITH_INTEGRATION, WITHOUT_INTEGRATION } = SEND_CLAIM_MESSAGES;

    cy.expect([
      sendClaimModal.has({ title: RECEIVING_PIECE_FORM_ACTIONS_LABELS.SEND_CLAIM }),
      sendClaimModal.has({
        message: including(hasIntegration ? WITH_INTEGRATION : WITHOUT_INTEGRATION),
      }),
      claimExpiryDateField.has({
        label: including(RECEIVING_PIECE_CLAIM_MODAL_FIELD_LABELS.CLAIM_EXPIRY_DATE),
        required: true,
        empty: true,
      }),
      internalNoteField.has({ label: RECEIVING_PIECE_CLAIM_MODAL_FIELD_LABELS.INTERNAL_NOTE }),
      externalNoteField.has({ label: RECEIVING_PIECE_CLAIM_MODAL_FIELD_LABELS.EXTERNAL_NOTE }),
      cancelButton.has({ disabled: false }),
      saveAndCloseButton.has({ disabled: false }),
    ]);
  },
  fillClaimExpiryDate(date) {
    cy.do(claimExpiryDateField.fillIn(date));
    cy.expect(claimExpiryDateField.has({ inputValue: date }));
  },
  checkClaimExpiryDateError(message) {
    cy.expect([
      claimExpiryDateField.has({ error: true }),
      sendClaimModal.find(HTML(including(message))).exists(),
    ]);
  },
  checkClaimExpiryDateHasNoError() {
    cy.expect(claimExpiryDateField.has({ error: false }));
  },
  fillExternalNote(note) {
    cy.do(externalNoteField.fillIn(note));
    cy.expect(externalNoteField.has({ value: note }));
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(sendClaimModal.absent());
  },
  clickSaveAndCloseButton({ closed = true } = {}) {
    cy.do(saveAndCloseButton.click());
    cy.expect(closed ? sendClaimModal.absent() : sendClaimModal.exists());
  },
};
