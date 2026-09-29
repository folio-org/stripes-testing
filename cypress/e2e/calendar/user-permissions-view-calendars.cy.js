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

      cy.createTempUser([permissions.calendarView.gui]).then((userProperties) => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.settingsCalendarPath,
          waiter: Calendar.waitCalendarPaneToLoad,
        });
      });
    });

    after(() => {
      // login as admin to teardown testing data
      cy.getAdminToken();
      deleteServicePoint(testServicePoint.id, true);
      deleteCalendar(testCalendarResponse.id);
    });

    it(
      'C361625 Permissions -> User with Settings (Calendar): Can view existing calendars (helios)',
      { tags: ['smoke', 'helios', 'C361625'] },
      () => {
        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.checkActionMenuAbsent();
        PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
        PaneActions.individualCalendarPane.checkActionMenuAbsent(testCalendar.name);
        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.checkNewButtonAbsent();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByCalendarName(testCalendar.name);
        PaneActions.individualCalendarPane.checkActionMenuAbsent(testCalendar.name);
      },
    );
  });
});
