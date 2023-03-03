import PaneActions from '../../support/fragments/calendar/pane-actions';


import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import { deleteServicePoint, createServicePoint, createCalendar,
  openCalendarSettings, deleteCalendar } from '../../support/fragments/calendar/calendar';
import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;



describe('User with Settings (Calendar): Can view existing calendars', () => {
  let testCalendarResponse;
  before(() => {
    // login as admin so necessary state can be created
    cy.loginAsAdmin();

    // get admin token to use in okapiRequest to retrieve service points
    if (!Cypress.env('token')) {
      cy.getAdminToken();
    }

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


  it('C361625 Permissions -> User with Settings (Calendar): Can view existing calendars (bama)', { tags: [TestTypes.smoke, devTeams.bama] }, () => {
    PaneActions.allCalendarsPane.openAllCalendarsPane();
    PaneActions.allCalendarsPane.checkActionMenuAbsent();
    PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
    PaneActions.individualCalendarPane.checkActionMenuAbsent(testCalendar.name);
    PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
    PaneActions.currentCalendarAssignmentsPane.checkNewButtonAbsent();
    PaneActions.currentCalendarAssignmentsPane.selectCalendarByCalendarName(testCalendar.name);
    PaneActions.individualCalendarPane.checkActionMenuAbsent(testCalendar.name);
  });
});
