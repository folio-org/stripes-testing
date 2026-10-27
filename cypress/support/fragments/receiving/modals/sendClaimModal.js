import {
  Button,
  Calendar,
  Datepicker,
  HTML,
  IconButton,
  Modal,
  TextArea,
  including,
} from '../../../../../interactors';
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

// Current month days of the calendar are rendered without "_" marks
const getCurrentMonthDays = (days) => days.filter((day) => !day.startsWith('_'));

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
  clearClaimExpiryDate() {
    cy.do(claimExpiryDateField.clear());
    cy.expect(claimExpiryDateField.has({ empty: true }));
  },
  checkClaimExpiryDateIsEmpty() {
    cy.expect(claimExpiryDateField.has({ empty: true }));
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
  openCalendar() {
    cy.do(claimExpiryDateField.openCalendar());
    cy.expect(Calendar().exists());
  },
  closeCalendar() {
    cy.do(sendClaimModal.click());
    cy.expect(Calendar().absent());
  },
  clickCalendarDay(day) {
    cy.do(Calendar().clickDay(day));
  },
  clickCalendarPreviousMonth() {
    cy.do(
      Calendar()
        .find(IconButton({ icon: 'caret-left' }))
        .click(),
    );
  },
  clickCalendarNextYear() {
    cy.do(
      Calendar()
        .find(IconButton({ icon: 'chevron-double-right' }))
        .click(),
    );
  },
  // Past days and today are excluded, future days of the current month are active
  verifyCalendarActiveDaysStartFromTomorrow() {
    const today = new Date().getDate();

    cy.then(() => Calendar().excludedDays()).then((excludedDays) => {
      const pastAndToday = Array.from({ length: today }, (_, index) => String(index + 1));

      expect(getCurrentMonthDays(excludedDays)).to.include.members(pastAndToday);
    });
    cy.then(() => Calendar().days()).then((days) => {
      getCurrentMonthDays(days).forEach((day) => expect(Number(day)).to.be.greaterThan(today));
    });
  },
  verifyCalendarDaysAreInactive() {
    cy.then(() => Calendar().days()).then((days) => {
      expect(getCurrentMonthDays(days)).to.have.length(0);
    });
  },
  verifyCalendarDaysAreActive() {
    cy.then(() => Calendar().excludedDays()).then((excludedDays) => {
      expect(getCurrentMonthDays(excludedDays)).to.have.length(0);
    });
  },
  fillInternalNote(note) {
    cy.do(internalNoteField.fillIn(note));
    cy.expect(internalNoteField.has({ value: note }));
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
