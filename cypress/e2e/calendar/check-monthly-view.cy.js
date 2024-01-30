import {
  createCalendar,
  createServicePoint,
  deleteCalendar,
  deleteServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';

import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;
const monthlyCalendarViewExpectedUIValues = calendarFixtures.expectedUIValues.monthlyCalendarView;

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
        PaneActions.monthlyCalendarView.selectCalendarByServicePoint(testServicePoint.name);
      });
    });

    after(() => {
      // delete test calendar
      deleteCalendar(testCalendarResponse.id);
    });

    it(
      'C360944 Checking the view of calendar on "Monthly calendar view" tab (bama)',
      { tags: ['smokeBama', 'bama'] },
      () => {
        PaneActions.monthlyCalendarView.checkPrevAndNextButtons({
          servicePointName: testServicePoint.name,
        });

        PaneActions.monthlyCalendarView.checkCalendarCells({
          calendar: testCalendar,
          monthlyCalendarViewExpectedUIValues,
        });
      },
    );
  });
});
