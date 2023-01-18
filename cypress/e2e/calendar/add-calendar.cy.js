import { deleteServicePoint, createServicePoint, createCalendar,
  openCalendarSettings, deleteCalendar } from '../../support/fragments/calendar/calendar';

import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;


describe('Add new calendar for service point', () => {
  let testCalendarResponse;

  const newCalendarInfo = {
    name: 'test-calendar-create',
    startDay: 1,
    endDay: 2
  };
  before(() => {
    // login and open calendar settings
    cy.loginAsAdmin();

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


  it('adds new calendar', () => {
    PaneActions.openCalendarWithServicePoint(testServicePoint.name);
    PaneActions.individualCalendarPane.close(testCalendarResponse.name);
    PaneActions.currentCalendarAssignmentsPane.clickNewButton();

    cy.deleteCalendar(testCalendarResponse.id);


    cy.url().should('match', /\/settings\/calendar\/active\/create$/);

    CreateCalendarForm.createCalendarWithoutHoursOfOperation(newCalendarInfo, testServicePoint.name);


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
      PaneActions.allCalendarsPane.checkCalendarExists(newCalendarInfo.name);

      // delete calendar
      deleteCalendar(calendarID);
    });
  });
});
