import {
  MultiColumnListCell, PaneHeader, Pane, Button,
  including, Link
} from '../../../interactors';


import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';
import permissions from '../../support/dictionary/permissions';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;



describe('User with Settings (Calendar): Can view existing calendars', () => {
  let testCalendarResponse;
  before(() => {
    // login as admin so necessary state can be created
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
    cy.logout();

    cy.openCalendarSettings();
    cy.createTempUser([
      permissions.calendarView.gui,
    ]).then(userProperties => {
      cy.login(userProperties.username, userProperties.password);
      cy.openCalendarSettings();
    });
  });

  after(() => {
    cy.logout();

    // // login as admin to teardown testing data
    cy.loginAsAdmin();
    cy.deleteServicePoint(testServicePoint.id, true);
    cy.deleteCalendar(testCalendarResponse.id);
  });


  it('views existing calendar', () => {
    const PaneActionButton = Button({ className: including('actionMenuToggle') });
    cy.do([
      Pane('Calendar').find(Link('All calendars')).click(),
      Pane('All calendars').find(PaneActionButton).absent(),

      Pane('All calendars').find(MultiColumnListCell(testCalendar.name)).click(),
      Pane(testCalendar.name).exists(),
      Pane(testCalendar.name).find(PaneActionButton).absent(),

      Pane('Calendar').find(Link('Current calendar assignments')).click(),
      PaneHeader('Current calendar assignments').find(Button('New')).absent(),

      Pane('Current calendar assignments').find(MultiColumnListCell(testServicePoint.name)).click(),
      Pane(testCalendar.name).find(PaneActionButton).absent()
    ]);
  });
});
