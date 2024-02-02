import {
  createCalendar,
  createServicePoint,
  deleteCalendar,
  deleteServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import {
  checkCalendarFields,
  checkExpandButton,
  checkMenuAction,
} from '../../support/fragments/calendar/calendar-info-pane';
import PaneActions from '../../support/fragments/calendar/pane-actions';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

describe('Calendar', () => {
  describe('Calendar New', () => {
    let testCalendarResponse;

    before(() => {
      // login and open calendar settings
      cy.loginAsAdmin();

      // get admin token to use in okapiRequest to retrieve service points
      if (!Cypress.env('token')) {
        cy.getAdminToken();
      }

      // reset db state
      deleteServicePoint(testServicePoint.id, false);

      // create test service point and calendar
      createServicePoint(testServicePoint, (response) => {
        testCalendar.assignments = [response.body.id];

        createCalendar(testCalendar, (calResponse) => {
          testCalendarResponse = calResponse.body;
        });
        openCalendarSettings();
        PaneActions.allCalendarsPane.openAllCalendarsPane();
      });
    });

    beforeEach(() => {
      openCalendarSettings();
      PaneActions.allCalendarsPane.openAllCalendarsPane();
    });

    after(() => {
      // delete test calendar
      deleteCalendar(testCalendarResponse.id);
    });

    it(
      'C360940 Checking the view of calendar on "All Calendars" tab (bama)',
      { tags: ['smokeBama', 'bama'] },
      () => {
        PaneActions.allCalendarsPane.checkNewAndPurgeMenuItemsExist();

        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.selectCalendar(testCalendarResponse.name);
        checkCalendarFields(testCalendar, testServicePoint);

        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.selectCalendar(testCalendarResponse.name);
        checkExpandButton();

        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.selectCalendar(testCalendarResponse.name);
        checkMenuAction(testCalendarResponse.name);
      },
    );
  });
});
