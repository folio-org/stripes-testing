import {
  MultiColumnListCell, PaneHeader, Pane, Button,
  including, Link
} from '../../../interactors';


import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import permissions from '../../support/dictionary/permissions';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;



describe('User with Settings (Calendar): Can create and assign new calendars', () => {
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
      permissions.calendarCreate.gui,
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


  it('checks if user can create and assign calendars', () => {
    const PaneActionButton = Button({ className: including('actionMenuToggle') });
    cy.do([
      Pane('Calendar').find(Link('All calendars')).click(),
      Pane('All calendars').find(PaneActionButton).exists(),
      Pane('All calendars').find(PaneActionButton).click(),
      Button('New').exists(),

      Pane('All calendars').find(MultiColumnListCell(testCalendar.name)).click(),
      Pane(testCalendar.name).exists(),
      Pane(testCalendar.name).find(PaneActionButton).exists(),
      Pane(testCalendar.name).find(PaneActionButton).click(),
      Button('Duplicate').exists(),

      Pane('Calendar').find(Link('Current calendar assignments')).click(),
      PaneHeader('Current calendar assignments').find(Button('New')).exists(),

      Pane('Current calendar assignments').find(MultiColumnListCell(testServicePoint.name)).click(),
      Pane(testCalendar.name).find(PaneActionButton).exists(),
      Pane(testCalendar.name).find(PaneActionButton).click(),
      Button('Duplicate').exists()
    ]);
  });
});
