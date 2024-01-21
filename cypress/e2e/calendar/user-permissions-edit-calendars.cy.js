import {
  createCalendar,
  createServicePoint,
  deleteCalendar,
  deleteServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';

import permissions from '../../support/dictionary/permissions';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

describe('Calendar', () => {
  describe('Calendar New', () => {
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
      cy.createTempUser([permissions.calendarEditCalendars.gui]).then((userProperties) => {
        cy.login(userProperties.username, userProperties.password);
        openCalendarSettings();
      });
    });

    after(() => {
      cy.logout();

      // // login as admin to teardown testing data
      cy.loginAsAdmin();
      deleteServicePoint(testServicePoint.id, true);
      deleteCalendar(testCalendarResponse.id);
    });

    it(
      'C365118 Permissions -> User with Settings (Calendar): Can edit and reassign existing calendars (bama)',
      { tags: ['smoke', 'bama'] },
      () => {
        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.checkActionMenuAbsent();

        PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
        PaneActions.checkPaneExists(testCalendar.name);
        PaneActions.individualCalendarPane.checkActionMenuPresent(testCalendar.name);
        PaneActions.individualCalendarPane.openActionMenu(testCalendar.name);
        PaneActions.editButtonExists();

        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.checkNewButtonAbsent();

        PaneActions.currentCalendarAssignmentsPane.selectCalendarByServicePoint(
          testServicePoint.name,
        );
        PaneActions.individualCalendarPane.checkActionMenuPresent(testCalendar.name);
        PaneActions.individualCalendarPane.openActionMenu(testCalendar.name);
        PaneActions.editButtonExists();
      },
    );
  });
});
