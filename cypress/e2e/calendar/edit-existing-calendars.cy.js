import {
  MultiColumnListCell, MultiColumnListRow, Pane, Button, Accordion, TextField,
  including, Link
} from '../../../interactors';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

// delete all but the first opening time
testCalendar.normalHours.splice(1);

const editExistingCalendarsData = calendarFixtures.data.editExistingCalendars;


describe('Edit existing calendars', () => {
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


  it('edits a single existing calendar', () => {
    cy.do([
      Pane('Calendar').find(Link('All calendars')).click(),
      Pane('All calendars').find(MultiColumnListCell(testCalendar.name)).click(),
      Pane(testCalendar.name).clickAction('Edit')
    ]);

    cy.url().should('match', /\/settings\/calendar\/all\/edit\/.+$/g);


    cy.do([
      TextField(including('Calendar name')).fillIn(editExistingCalendarsData.name),
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ column: 'Actions' }))
        .find(Button({ ariaLabel: 'trash' }))
        .click(),
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ column: 'Actions' }))
        .find(Button({ ariaLabel: 'trash' }))
        .click(),

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
        Pane('All calendars').find(MultiColumnListCell(editExistingCalendarsData.name)).exists(),
        Pane('All calendars').find(MultiColumnListCell(editExistingCalendarsData.name)).click(),
      ]);

      const daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const hoursOfOperationAccordion = Pane(editExistingCalendarsData.name).find(Accordion('Hours of operation'));

      const jobs = [];

      daysOfTheWeek.forEach(day => {
        const row = hoursOfOperationAccordion.find(MultiColumnListRow({ content: including(day), isContainer: true }));
        jobs.push(row.exists());
        jobs.push(row.find(MultiColumnListCell({ column: 'Open', content: 'Closed' })).exists());
      });

      cy.do(jobs);
    });
  });
});
