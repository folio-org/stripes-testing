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
    let testCalendarResponse;

    before(() => {
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

    after(() => {
      cy.getAdminToken();
      if (testCalendarResponse) {
        deleteCalendar(testCalendarResponse.id);
      }
      ServicePoints.deleteViaApi(testServicePoint.id);
    });

    it(
      'C360941 Checking the view of calendar on "Current calendar assignments" tab (helios)',
      { tags: ['smoke', 'helios', 'C360941'] },
      () => {
        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.checkNewButtonExists();
        PaneActions.currentCalendarAssignmentsPane.checkCalendarWithServicePointExists(
          testServicePoint.name,
        );

        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByCalendarName(
          testCalendarResponse.name,
        );
        checkCalendarFields(testCalendar, testServicePoint);

        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByCalendarName(
          testCalendarResponse.name,
        );
        checkExpandButton();

        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByCalendarName(
          testCalendarResponse.name,
        );
        checkMenuAction(testCalendarResponse.name);
      },
    );
  });
});
