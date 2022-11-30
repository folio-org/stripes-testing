import {
  TextField, HTML, Calendar, Accordion, MultiSelect, Pane, PaneHeader, MultiColumnList,
  MultiColumnListCell, MultiColumnListRow, Button, including, Link
} from '../../../interactors';

import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;


const toggleCalendarButton = HTML.extend('toggle calendar button').selector('button[id^=datepicker-toggle-calendar-button-dp-]');

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
    cy.deleteServicePoint(testServicePoint.id, false);

    // create test service point
    cy.createServicePoint(testServicePoint, (response) => {
      testCalendar.assignments = [response.body.id];

      cy.createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });
    });
    cy.openCalendarSettings();
  });


  it('adds new calendar', () => {
    cy.do([
      Pane('Calendar').find(Link('Current calendar assignments')).click(),
      Pane('Current calendar assignments').find(MultiColumnListCell(testServicePoint.name, { column: 'Service point' })).click(),
      Pane(testCalendarResponse.name).find(Button({ ariaLabel: 'Close ' + testCalendarResponse.name })).click(),
      PaneHeader('Current calendar assignments').find(Button('New')).click()
    ]);

    cy.deleteCalendar(testCalendarResponse.id);


    cy.url().should('match', /\/settings\/calendar\/active\/create$/);



    cy.do([
      TextField(including('Calendar name')).fillIn(newCalendarInfo.name),
      TextField(including('Start date')).find(toggleCalendarButton()).click(),
      Calendar().clickActiveDay(newCalendarInfo.startDay),
      TextField(including('End date')).find(toggleCalendarButton()).click(),
      Calendar().clickActiveDay(newCalendarInfo.endDay),
      MultiSelect({ label: 'Service points' }).choose(testServicePoint.name),
      Accordion('Hours of operation').find(MultiColumnList()).find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ column: 'Actions' }))
        .find(Button({ ariaLabel: 'trash' }))
        .click(),
      Button('Save and close').click()
    ]);



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
      cy.openCalendarSettings();
      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').find(MultiColumnListCell(newCalendarInfo.name)).exists(),
      ]);

      // delete calendar
      cy.deleteCalendar(calendarID);
    });
  });
});
