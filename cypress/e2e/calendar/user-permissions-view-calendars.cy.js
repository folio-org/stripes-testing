import permissions from '../../support/dictionary/permissions';
import Calendar, {
  createCalendar,
  deleteCalendar,
  getTestCalendar,
  getTestServicePoint,
} from '../../support/fragments/calendar/calendar';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const testServicePoint = getTestServicePoint();
const testCalendar = getTestCalendar({ assignments: [testServicePoint.id] });

describe('Calendar', () => {
  describe('Calendar New', () => {
    let testCalendarResponse;
    let user;
    before(() => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testServicePoint);
      createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });

      cy.createTempUser([permissions.calendarView.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.settingsCalendarPath,
          waiter: Calendar.waitCalendarPaneToLoad,
        });
      });
    });

    after(() => {
      // login as admin to teardown testing data
      cy.getAdminToken();
      if (testCalendarResponse) {
        deleteCalendar(testCalendarResponse.id);
      }
      ServicePoints.deleteViaApi(testServicePoint.id);
      if (user) {
        Users.deleteViaApi(user.userId);
      }
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
