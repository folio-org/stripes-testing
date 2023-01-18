import PaneActions from '../../support/fragments/calendar/pane-actions';


import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import { deleteServicePoint, createServicePoint, createCalendar,
  openCalendarSettings, deleteCalendar } from '../../support/fragments/calendar/calendar';
import permissions from '../../support/dictionary/permissions';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;



describe('User with Settings (Calendar): Can view existing calendars', () => {
  let testCalendarResponse;
  before(() => {
    // login as admin so necessary state can be created
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
    cy.logout();

    openCalendarSettings();
    cy.createTempUser([
      permissions.calendarView.gui,
    ]).then(userProperties => {
      cy.login(userProperties.username, userProperties.password);
      openCalendarSettings();
    });
  });

  after(() => {
    cy.logout();

    // login as admin to teardown testing data
    cy.loginAsAdmin();
    deleteServicePoint(testServicePoint.id, true);
    deleteCalendar(testCalendarResponse.id);
  });


  it('views existing calendar', () => {
    PaneActions.allCalendarsPane.checkActionMenuAbsent();
    PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
    PaneActions.individualCalendarPane.checkActionMenuAbsent(testCalendar.name);
    PaneActions.currentCalendarAssignmentsPane.newButtonAbsent();
    PaneActions.currentCalendarAssignmentsPane.selectCalendar();
    PaneActions.individualCalendarPane.checkActionMenuAbsent(testCalendar.name);
  });
});
