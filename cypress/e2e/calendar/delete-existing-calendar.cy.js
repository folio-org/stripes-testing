import {
  MultiColumnListCell, Modal, Pane, Button, Link
} from '../../../interactors';
import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;


describe('Delete existing calendars', () => {
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
  });


  it('deletes a single existing calendar', () => {
    cy.do([
      Pane('Calendar').find(Link('All calendars')).click(),
      Pane('All calendars').find(MultiColumnListCell(testCalendar.name)).click(),
      Pane(testCalendar.name).clickAction('Delete'),
      Modal('Confirm deletion').exists(),
      Modal('Confirm deletion').find(Button('Cancel')).click(),
      Modal('Confirm deletion').absent(),
    ]);

    cy.do([
      Pane(testCalendar.name).exists(),
      Pane(testCalendar.name).clickAction('Delete'),
      Modal('Confirm deletion').exists(),
      Modal('Confirm deletion').dismiss(),
      Modal('Confirm deletion').absent(),
    ]);

    cy.do([
      Pane(testCalendar.name).clickAction('Delete'),
      Modal('Confirm deletion').exists(),
      Modal('Confirm deletion').find(Button('Delete')).click(),
      Pane('All calendars').find(MultiColumnListCell(testCalendar.name)).absent()
    ]);
  });
});
