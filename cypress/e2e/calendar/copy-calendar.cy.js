import { including, Link, TextField, Pane, MultiColumnListCell, Button } from '../../../interactors';

import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';

const testCalendar = calendarFixtures.calendar;



describe('Duplicate an existing calendar to make a new one', () => {
  let testCalendarResponse;
  const duplicateCalendarName = 'test-calendar-a8531527-aa3b-447a-8c76-88f905ade409-duplicate';

  before(() => {
    // login
    cy.openCalendarSettings(false);

    // create test calendar
    cy.createCalendar(testCalendar, (calResponse) => {
      testCalendarResponse = calResponse.body;
    });

    cy.openCalendarSettings();
  });

  after(() => {
    // delete test calendar
    // cy.deleteCalendar(testCalendarResponse.id);
  });


  it('should allow user to duplicate an existing calendar', () => {
    cy.do([
      Pane('Calendar').find(Link('All calendars')).click(),
      Pane('All calendars').find(MultiColumnListCell(testCalendarResponse.name)).click(),
      Pane(testCalendarResponse.name).clickAction('Duplicate'),
      TextField(including('Calendar name')).fillIn(duplicateCalendarName),
      Button('Save and close').click()
    ]);



    // intercept http request
    let duplicateCalendarID;
    cy.intercept(Cypress.env('OKAPI_HOST') + '/calendar/calendars', (req) => {
      if (req.method === 'POST') {
        req.continue((res) => {
          expect(res.statusCode).equals(201);
          duplicateCalendarID = res.body.id;
        });
      }
    }).as('createDuplicateCalendar');

    // check that duplicate calendar exists in list of calendars
    cy.wait('@createDuplicateCalendar').then(() => {
      cy.deleteCalendar(testCalendarResponse.id);
      cy.openCalendarSettings();
      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').find(MultiColumnListCell(duplicateCalendarName)).exists()
      ]);

      // delete duplicate calendar
      cy.deleteCalendar(duplicateCalendarID);
    });
  });
});
