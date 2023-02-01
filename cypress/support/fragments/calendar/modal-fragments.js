import {
  Accordion,
  Button,
  including,
  ListItem,
  Modal,
  Select
} from '../../../../interactors';

export default {
  checkCalendarDeletionModalExists() {
    cy.do([
      Modal('Confirm deletion').exists(),
    ]);
  },
  clickDeleteButtonOnCalendarDeletionModal() {
    cy.do([
      Modal('Confirm deletion').find(Button('Delete')).click()
    ]);
  },
  checkCalendarDeletionModalWithCancelButton() {
    cy.do([
      Modal('Confirm deletion').exists(),
      Modal('Confirm deletion').find(Button('Cancel')).click(),
      Modal('Confirm deletion').absent(),
    ]);
  },

  checkCalendarDeletionModalWithDismiss() {
    cy.do([
      Modal('Confirm deletion').exists(),
      Modal('Confirm deletion').dismiss(),
      Modal('Confirm deletion').absent()
    ]);
  },

  checkPurgeOldCalendarsModalWithDismiss() {
    cy.do([
      Modal('Purge old calendars').exists(),
      Modal('Purge old calendars').dismiss(),
      Modal('Purge old calendars').absent()
    ]);
  },

  checkPurgeOldCalendarsModalExists() {
    cy.do(
      Modal('Purge old calendars').exists()
    );
  },

  checkPurgeOldCalendarsModalAbsent() {
    cy.do(
      Modal('Purge old calendars').absent()
    );
  },

  purgeOldCalendars: {
    checkSelectFields() {
      cy.do([
        Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).exists(),
        Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).choose('more than 3 months ago'),
        Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).choose('more than 6 months ago'),
        Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).choose('more than 1 year ago'),
        Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).choose('more than 2 years ago'),
      ]);

      // check that all select options are present
      cy.do([
        Modal('Purge old calendars').find(Select({ label: including('And were...') })).exists(),
        Modal('Purge old calendars').find(Select({ label: including('And were...') })).choose('not assigned to any service points'),
        Modal('Purge old calendars').find(Select({ label: including('And were...') })).choose('assigned or not assigned to service points')
      ]);
    },
    purgeCalendarsMoreThanThreeMonthsOld({ calendarName }) {
      cy.do([
        Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).choose('more than 3 months ago'),
        Modal('Purge old calendars').find(Select({ label: including('And were...') })).choose('not assigned to any service points'),
        Modal('Purge old calendars').find(Accordion('Calendars to be deleted')).clickHeader(),
        Modal('Purge old calendars').find(Accordion('Calendars to be deleted')).find(ListItem(calendarName)).exists(),
        Modal('Purge old calendars').find(Button('Delete')).click(),
      ]);
    },
    clickCancelButton() {
      cy.do(
        Modal('Purge old calendars').find(Button('Cancel')).click()
      );
    }
  }
};

