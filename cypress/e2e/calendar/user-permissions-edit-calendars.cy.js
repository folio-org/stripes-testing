import permissions from '../../support/dictionary/permissions';
import Calendar, {
  createCalendar,
  createServicePoint,
  deleteCalendar,
  deleteServicePoint
} from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import TopMenu from '../../support/fragments/topMenu';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

describe('Calendar', () => {
  describe('Calendar New', () => {
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

      cy.createTempUser([permissions.calendarEditCalendars.gui]).then((userProperties) => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.settingsCalendarPath,
          waiter: Calendar.waitCalendarPaneToLoad,
        });
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
      'C365118 Permissions -> User with Settings (Calendar): Can edit and reassign existing calendars (helios)',
      { tags: ['smoke', 'helios', 'C365118'] },
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
