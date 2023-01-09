import {
  MultiColumnListCell, MultiColumnListRow, Pane, Button, Accordion,
  including, Link
} from '../../../interactors';
import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';


const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

// delete all but the first opening time
const testOpeningHours = {
  startDay: 'Monday',
  startTime: '09:00',
  endDay: 'Thursday',
  endTime: '13:00'
};
testCalendar.normalHours = [
  testOpeningHours
];


describe('Delete existing hours of operation for service point', () => {
  let testCalendarResponse;
  before(() => {
    // login
    cy.loginAsAdmin();

    // reset db state
    cy.deleteServicePoint(testServicePoint.id, false);

    // create test service point
    cy.createServicePoint(testServicePoint, (response) => {
      testCalendar.assignments = [response.body.id];

      cy.createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });
      cy.openCalendarSettings();
    });

    cy.openCalendarSettings();
  });

  after(() => {
    cy.deleteServicePoint(testServicePoint.id, true);
    cy.deleteCalendar(testCalendarResponse.id);
  });


  it('deletes hours of operation for an open day', () => {
    cy.do([
      Pane('Calendar').find(Link('Current calendar assignments')).click(),
      Pane('Current calendar assignments').find(MultiColumnListCell(testServicePoint.name, { column: 'Service point' })).click(),
      Pane(testCalendar.name).find(Accordion('Hours of operation')).find(MultiColumnListRow({ content: including(testOpeningHours.startDay), isContainer: true }))
        .find(MultiColumnListCell({ column: 'Open', content: '9:00 AM' }))
        .exists(),
      Pane(testCalendar.name).find(Accordion('Hours of operation')).find(MultiColumnListRow({ content: including(testOpeningHours.endDay), isContainer: true }))
        .find(MultiColumnListCell({ column: 'Close', content: '1:00 PM' }))
        .exists(),
      Pane(testCalendar.name).clickAction('Edit')
    ]);

    cy.url().should('match', /\/settings\/calendar\/active\/edit\/.+$/g);


    cy.do([
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 1 })).find(MultiColumnListCell({ column: 'Actions' }))
        .find(Button({ ariaLabel: 'trash' }))
        .click(),
    ]);

    cy.do([
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 3 })).absent(),
      Button('Save and close').click()
    ]);



    // intercept http request
    cy.intercept(Cypress.env('OKAPI_HOST') + '/calendar/calendars/' + testCalendarResponse.id, (req) => {
      if (req.method === 'PUT') {
        req.continue((res) => {
          expect(res.statusCode).equals(200);
        });
      }
    }).as('editCalendar');


    cy.wait('@editCalendar').then(() => {
      cy.openCalendarSettings();
      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').find(MultiColumnListCell(testCalendar.name)).click(),
      ]);


      cy.do([
        Pane(testCalendar.name).find(Accordion('Hours of operation')).find(MultiColumnListRow({ content: including(testOpeningHours.startDay), isContainer: true }))
          .find(MultiColumnListCell({ column: 'Open', content: 'Closed' }))
          .exists(),
        Pane(testCalendar.name).find(Accordion('Hours of operation')).find(MultiColumnListRow({ content: including(testOpeningHours.endDay), isContainer: true }))
          .find(MultiColumnListCell({ column: 'Open', content: 'Closed' }))
          .exists(),
      ]);
    });
  });
});
