import { MultiColumnList, MultiColumnListCell, Button, Pane, PaneHeader, Link } from '../../../interactors';
import {
  checkCalendarFields, checkExpandButton, checkMenuAction
} from '../../support/fragments/calendar/calendar-info-pane';

import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

describe('Checking the view of calendar on "Current Calendar assignments tab"', () => {
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
    cy.do(Pane('Calendar').find(Link('Current calendar assignments')).click());
  });

  after(() => {
    // delete test calendar
    cy.deleteCalendar(testCalendarResponse.id);
  });

  it('should check that the "Current calendar assignments" tab contains all appropriate elements', () => {
    cy.do([
      PaneHeader('Current calendar assignments').find(Button('New')).exists(),
      MultiColumnList().find(MultiColumnListCell(testServicePoint.name, { column: 'Service point' })).exists(),
    ]);
  });

  it('should check that the fields of the calendar exists', () => {
    cy.do([
      Pane('Current calendar assignments').find(MultiColumnListCell(testCalendarResponse.name, { column: 'Calendar name' })).click(),
    ]);
    checkCalendarFields(testCalendar, testServicePoint);
  });

  it('should check that the expand/collapse button works correctly', () => {
    cy.do(
      Pane('Current calendar assignments').find(MultiColumnListCell(testCalendarResponse.name, { column: 'Calendar name' })).click(),
    );
    checkExpandButton();
  });

  it('should check that the individual calendar tab has the appropriate menu actions', () => {
    cy.do(
      Pane('Current calendar assignments').find(MultiColumnListCell(testCalendarResponse.name, { column: 'Calendar name' })).click(),
    );
    checkMenuAction(testCalendarResponse.name);
  });
});
