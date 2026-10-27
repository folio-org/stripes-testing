import Calendar, {
  createCalendar,
  deleteCalendar,
  getTestCalendar,
  getTestServicePoint,
} from '../../support/fragments/calendar/calendar';
import {
  checkCalendarFields,
  checkExpandButton,
  checkMenuAction,
} from '../../support/fragments/calendar/calendar-info-pane';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';

const testServicePoint = getTestServicePoint();
const testCalendar = getTestCalendar({ assignments: [testServicePoint.id] });

describe('Calendar', () => {
  describe('Calendar New', () => {
    // mod-calendar ignores the fixture's calendar ID and assigns its own, so the ID from the
    // response is used for cleanup
    let testCalendarResponse;

    before('Create test data and log in', () => {
      // Create data via API before the UI login: getAdminToken clears cookies,
      // which ends a UI session that is already open
      cy.getAdminToken();
      ServicePoints.createViaApi(testServicePoint);
      createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });

      cy.loginAsAdmin({
        path: TopMenu.settingsCalendarPath,
        waiter: Calendar.waitCalendarPaneToLoad,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      if (testCalendarResponse) {
        deleteCalendar(testCalendarResponse.id);
      }
      ServicePoints.deleteViaApi(testServicePoint.id);
    });

    it(
      'C360940 Checking the view of calendar on "All Calendars" tab (helios)',
      { tags: ['smoke', 'helios', 'C360940'] },
      () => {
        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.checkNewAndPurgeMenuItemsExist();

        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
        checkCalendarFields(testCalendar, testServicePoint);

        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
        checkExpandButton();

        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
        checkMenuAction(testCalendar.name);
      },
    );
  });
});
