import {
  createCalendar,
  createServicePoint,
  deleteCalendar,
  deleteServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import PaneActions from '../../support/fragments/calendar/pane-actions';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

// delete all but the first opening time
const testOpeningHours = {
  startDay: 'Monday',
  startTime: '09:00',
  endDay: 'Thursday',
  endTime: '13:00',
};
testCalendar.normalHours = [testOpeningHours];

describe('Delete existing hours of operation for service point', () => {
  let testCalendarResponse;
  before(() => {
    // login
    cy.loginAsAdmin();

    // get admin token to use in okapiRequest to retrieve service points
    if (!Cypress.env('token')) {
      cy.getAdminToken();
    }

    // reset db state
    deleteServicePoint(testServicePoint.id, false);

    // create test service point
    createServicePoint(testServicePoint, (response) => {
      testCalendar.assignments = [response.body.id];

      createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });
      openCalendarSettings();
    });
  });

  after(() => {
    deleteServicePoint(testServicePoint.id, true);
    deleteCalendar(testCalendarResponse.id);
  });

  it(
    'C2306 Delete -> Delete existing hours of operation for service point (bama)',
    { tags: ['smoke', 'bama'] },
    () => {
      PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
      PaneActions.currentCalendarAssignmentsPane.selectCalendarByServicePoint(
        testServicePoint.name,
      );
      PaneActions.individualCalendarPane.selectEditAction({ calendarName: testCalendar.name });
      PaneActions.individualCalendarPane.checkEditURLFromCurrentAssignmentsPage();

      CreateCalendarForm.deleteHoursOfOperationAndSave();

      // intercept http request
      cy.intercept(
        Cypress.env('OKAPI_HOST') + '/calendar/calendars/' + testCalendarResponse.id,
        (req) => {
          if (req.method === 'PUT') {
            req.continue((res) => {
              expect(res.statusCode).equals(200);
            });
          }
        },
      ).as('editCalendar');

      cy.wait('@editCalendar').then(() => {
        openCalendarSettings();
        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.checkCalendarExists(testCalendar.name);
        PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);

        PaneActions.individualCalendarPane.checkDeleteHoursOfOperation({
          calendarName: testCalendar.name,
          openingHoursData: testOpeningHours,
        });
      });
    },
  );
});
