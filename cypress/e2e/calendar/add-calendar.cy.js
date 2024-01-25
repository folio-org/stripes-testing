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

describe('Calendar', () => {
  describe('Calendar New', () => {
    let testCalendarResponse;

    const newCalendarInfo = {
      name: 'test-calendar-create',
      startDay: 1,
      endDay: 2,
    };
    before(() => {
      // login and open calendar settings
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
      });
      openCalendarSettings();
    });

    it(
      'C360958 Create -> Add new calendar for service point (bama)',
      { tags: ['smokeBama', 'bama'] },
      () => {
        PaneActions.openCalendarWithServicePoint(testServicePoint.name);
        PaneActions.individualCalendarPane.close(testCalendarResponse.name);
        PaneActions.currentCalendarAssignmentsPane.clickNewButton();

        deleteCalendar(testCalendarResponse.id);

        CreateCalendarForm.createCalendarWithoutHoursOfOperation(
          newCalendarInfo,
          testServicePoint.name,
        );

        // intercept http request
        let calendarID;
        cy.intercept(Cypress.env('OKAPI_HOST') + '/calendar/calendars', (req) => {
          if (req.method === 'POST') {
            req.continue((res) => {
              expect(res.statusCode).equals(201);
              calendarID = res.body.id;
            });
          }
        }).as('createCalendar');

        // check that new calendar exists in list of calendars
        cy.wait('@createCalendar').then(() => {
          openCalendarSettings();
          PaneActions.allCalendarsPane.openAllCalendarsPane();
          PaneActions.allCalendarsPane.checkCalendarExists(newCalendarInfo.name);

          // delete calendar
          deleteCalendar(calendarID);
        });
      },
    );
  });
});
