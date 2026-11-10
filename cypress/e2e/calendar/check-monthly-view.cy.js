import Calendar, {
  createCalendar,
  deleteCalendar,
  getTestCalendar,
  getTestServicePoint,
} from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';

const testServicePoint = getTestServicePoint();
const testCalendar = getTestCalendar({ assignments: [testServicePoint.id] });
const monthlyCalendarViewExpectedUIValues = calendarFixtures.expectedUIValues.monthlyCalendarView;

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
      PaneActions.monthlyCalendarView.selectCalendarByServicePoint(testServicePoint.name);
    });

    after(() => {
      cy.getAdminToken();
      if (testCalendarResponse) {
        deleteCalendar(testCalendarResponse.id);
      }
      ServicePoints.deleteViaApi(testServicePoint.id);
    });

    it(
      'C360944 Checking the view of calendar on "Monthly calendar view" tab (helios)',
      { tags: ['smoke', 'helios', 'C360944'] },
      () => {
        PaneActions.monthlyCalendarView.checkPrevAndNextButtons({
          servicePointName: testServicePoint.name,
        });

        PaneActions.monthlyCalendarView.checkCalendarCells({
          calendar: testCalendar,
          monthlyCalendarViewExpectedUIValues,
        });
      },
    );
  });
});
