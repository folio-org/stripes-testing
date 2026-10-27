import {
  Button,
  Calendar,
  Datepicker,
  HTML,
  IconButton,
  Modal,
  including,
} from '../../../../../interactors';
import { COMMON_BUTTON_LABELS, RECEIVING_PIECE_FORM_ACTIONS_LABELS } from '../../../constants';

const RECEIVING_PIECE_CLAIM_MODAL_FIELD_LABELS = {
  DELAY_TO: 'Delay to',
};

const delayClaimModal = Modal({ id: 'delay-claim-modal' });
const delayToField = delayClaimModal.find(Datepicker());
const cancelButton = delayClaimModal.find(Button(COMMON_BUTTON_LABELS.CANCEL));
const saveAndCloseButton = delayClaimModal.find(Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE));

// Current month days of the calendar are rendered without "_" marks
const getCurrentMonthDays = (days) => days.filter((day) => !day.startsWith('_'));

export default {
  waitLoading() {
    cy.expect(delayClaimModal.exists());
  },
  verifyModalView() {
    cy.expect([
      delayClaimModal.has({ title: RECEIVING_PIECE_FORM_ACTIONS_LABELS.DELAY_CLAIM }),
      delayToField.has({
        label: including(RECEIVING_PIECE_CLAIM_MODAL_FIELD_LABELS.DELAY_TO),
        required: true,
        empty: true,
      }),
      cancelButton.has({ disabled: false }),
      saveAndCloseButton.has({ disabled: false }),
    ]);
  },
  fillDelayToDate(date) {
    cy.do(delayToField.fillIn(date));
    cy.expect(delayToField.has({ inputValue: date }));
  },
  clearDelayToDate() {
    cy.do(delayToField.clear());
    cy.expect(delayToField.has({ empty: true }));
  },
  checkDelayToDateIsEmpty() {
    cy.expect(delayToField.has({ empty: true }));
  },
  checkDelayToDateError(message) {
    cy.expect([
      delayToField.has({ error: true }),
      delayClaimModal.find(HTML(including(message))).exists(),
    ]);
  },
  openCalendar() {
    cy.do(delayToField.openCalendar());
    cy.expect(Calendar().exists());
  },
  closeCalendar() {
    cy.do(delayClaimModal.click());
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
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(delayClaimModal.absent());
  },
  clickSaveAndCloseButton({ closed = true } = {}) {
    cy.do(saveAndCloseButton.click());
    cy.expect(closed ? delayClaimModal.absent() : delayClaimModal.exists());
  },
};
