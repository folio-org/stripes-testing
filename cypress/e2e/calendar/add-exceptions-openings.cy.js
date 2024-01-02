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

const addExceptionsOpeningData = calendarFixtures.data.addExceptionsOpening;
const addExceptionsOpeningExpectedUIValues = calendarFixtures.expectedUIValues.addExceptionsOpening;

describe('Add exceptions--closures to regular hours for service point', () => {
  let testCalendarResponse;
  before(() => {
    // login
    openCalendarSettings(false);

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
    });
  });

  after(() => {
    // delete test calendar
    deleteCalendar(testCalendarResponse.id);
  });

  it(
    'C360951 Add exceptions--openings to regular hours for service point (bama)',
    { tags: ['smoke', 'bama'] },
    () => {
      PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
      PaneActions.currentCalendarAssignmentsPane.selectCalendarByServicePoint(
        testServicePoint.name,
      );
      PaneActions.currentCalendarAssignmentsPane.clickEditAction(testCalendar.name);

      CreateCalendarForm.addOpeningExceptions(addExceptionsOpeningData);

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
      ).as('updateCalendar');

      // check that new calendar exists in list of calendars
      cy.wait('@updateCalendar').then(() => {
        openCalendarSettings();
        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);

        PaneActions.individualCalendarPane.checkOpeningExceptions({
          calendarName: testCalendar.name,
          addExceptionsOpeningData,
          addExceptionsOpeningExpectedUIValues,
        });
      });
    },
  );
});
