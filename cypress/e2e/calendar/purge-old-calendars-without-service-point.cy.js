import {
  createCalendar,
  deleteServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import ModalFragments from '../../support/fragments/calendar/modal-fragments';
import PaneActions from '../../support/fragments/calendar/pane-actions';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

// set calendar start and end date to at least 3 months ago
testCalendar.startDate = '2022-01-01';
testCalendar.endDate = '2022-01-31';
testCalendar.exceptions = [];

describe('Calendar', () => {
  describe('Calendar New', () => {
    before(() => {
      // login
      cy.loginAsAdmin();

      // get admin token to use in okapiRequest to retrieve service points
      if (!Cypress.env('token')) {
        cy.getAdminToken();
      }

      // reset db state
      deleteServicePoint(testServicePoint.id, false);

      // create calendar with no service point
      testCalendar.assignments = [];
      createCalendar(testCalendar);
      openCalendarSettings();
    });

    it(
      'C360952 Delete -> Purge calendars that are not assigned to any service points (bama)',
      { tags: ['smoke', 'bama'] },
      () => {
        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.checkCalendarExists(testCalendar.name);
        PaneActions.allCalendarsPane.clickPurgeOldCalendarsAction();
        ModalFragments.checkPurgeOldCalendarsModalExists();

        // check that all select field options are present
        ModalFragments.purgeOldCalendars.checkSelectFields();

        ModalFragments.purgeOldCalendars.purgeCalendarsMoreThanThreeMonthsOld({
          calendarName: testCalendar.name,
          hasServicePoint: false,
        });

        PaneActions.allCalendarsPane.checkCalendarAbsent(testCalendar.name);
      },
    );
  });
});
