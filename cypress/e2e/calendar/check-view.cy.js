import { Button, MultiColumnListCell, Pane, including, Link } from '../../../interactors';
import {
  checkCalendarFields, checkExpandButton, checkMenuAction
} from '../../support/fragments/calendar/calendar-info-pane';
import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;


describe('Checking the view of calendar on "All Calendars" tab', () => {
  let testCalendarResponse;

  before(() => {
    // login and open calendar settings
    cy.loginAsAdmin();

    // reset db state
    cy.deleteServicePoint(testServicePoint.id, false);

    // create test service point and calendar
    cy.createServicePoint(testServicePoint, (response) => {
      testCalendar.assignments = [response.body.id];

      cy.createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });
    });
  });


  beforeEach(() => {
    cy.openCalendarSettings();
    cy.do(Pane('Calendar').find(Link('All calendars')).click());
  });

  after(() => {
    // delete test calendar
    cy.deleteCalendar(testCalendarResponse.id);
  });


  it('should check that the appropriate actions menu exists in the "All calendars" tab', () => {
    cy.do([
      Pane('All calendars').find(Button({ className: including('actionMenuToggle') })).click(),
      Button('New').exists(),
      Button('Purge old calendars').exists(),
    ]);
  });

  it('should check that the fields of the calendar exists', () => {
    cy.do(
      Pane('All calendars').find(MultiColumnListCell(testCalendarResponse.name)).click(),
    );
    checkCalendarFields(testCalendar, testServicePoint);
  });

  it('should check that the expand/collapse button works correctly', () => {
    cy.do(
      Pane('All calendars').find(MultiColumnListCell(testCalendarResponse.name, { column: 'Calendar name' })).click(),
    );
    checkExpandButton();
  });

  it('should check that the individual calendar tab has the appropriate menu actions', () => {
    cy.do(
      Pane('All calendars').find(MultiColumnListCell(testCalendarResponse.name, { column: 'Calendar name' })).click(),
    );
    checkMenuAction(testCalendarResponse.name);
  });
});
