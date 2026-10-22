import Calendar, {
  createCalendar,
  deleteCalendarIfExists,
  getTestCalendar,
  getTestServicePoint,
} from '../../support/fragments/calendar/calendar';
import ModalFragments from '../../support/fragments/calendar/modal-fragments';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';

const testServicePoint = getTestServicePoint();
// Purging is environment-wide: this spec purges calendars that ended more than a year ago, so it
// can't remove the calendar of purge-old-calendars-without-service-point, which ended ~5 months ago
const testCalendar = getTestCalendar({
  assignments: [testServicePoint.id],
  startDate: '2022-01-01',
  endDate: '2022-01-31',
  exceptions: [],
});

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

      cy.loginAsAdmin({ path: TopMenu.settingsCalendarPath, waiter: Calendar.waitCalendarPaneToLoad });
    });

    after(() => {
      cy.getAdminToken();
      // The test purges the calendar; this only cleans up if it failed before that
      deleteCalendarIfExists(testCalendarResponse?.id);
      ServicePoints.deleteViaApi(testServicePoint.id);
    });

    it(
      'C360946 Delete -> Purge old calendars with a selectable date (helios)',
      { tags: ['smoke', 'helios', 'C360946'] },
      () => {
        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.checkCalendarExists(testCalendar.name);
        PaneActions.allCalendarsPane.clickPurgeOldCalendarsAction();
        ModalFragments.checkPurgeOldCalendarsModalExists();

        ModalFragments.purgeOldCalendars.checkSelectFields();
        ModalFragments.purgeOldCalendars.clickCancelButton();
        ModalFragments.checkPurgeOldCalendarsModalAbsent();

        PaneActions.allCalendarsPane.clickPurgeOldCalendarsAction();
        ModalFragments.checkPurgeOldCalendarsModalWithDismiss();

        PaneActions.allCalendarsPane.clickPurgeOldCalendarsAction();
        ModalFragments.checkPurgeOldCalendarsModalExists();

        ModalFragments.purgeOldCalendars.purgeCalendarsEndedMoreThan({
          period: 'more than 1 year ago',
          calendarName: testCalendar.name,
          hasServicePoint: true,
        });

        PaneActions.allCalendarsPane.checkCalendarAbsent(testCalendar.name);
      },
    );
  });
});
