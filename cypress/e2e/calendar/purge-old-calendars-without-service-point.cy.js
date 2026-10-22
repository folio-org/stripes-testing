import Calendar, {
  createCalendar,
  deleteCalendarIfExists,
  getTestCalendar,
} from '../../support/fragments/calendar/calendar';
import ModalFragments from '../../support/fragments/calendar/modal-fragments';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';

// Calendar with no service point that ended ~5 months ago: old enough for "more than 3 months
// ago", but not for purge-old-calendars, which purges calendars that ended more than a year ago
const fiveMonthsAgo = new Date();
fiveMonthsAgo.setDate(1);
fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
const fiveMonthsAgoEnd = new Date(fiveMonthsAgo.getFullYear(), fiveMonthsAgo.getMonth(), 10);
const testCalendar = getTestCalendar({
  assignments: [],
  startDate: DateTools.getFormattedDate({ date: fiveMonthsAgo }),
  endDate: DateTools.getFormattedDate({ date: fiveMonthsAgoEnd }),
  exceptions: [],
});

describe('Calendar', () => {
  describe('Calendar New', () => {
    let testCalendarResponse;

    before(() => {
      // Create data via API before the UI login: getAdminToken clears cookies,
      // which ends a UI session that is already open
      cy.getAdminToken();
      createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });

      cy.loginAsAdmin({ path: TopMenu.settingsCalendarPath, waiter: Calendar.waitCalendarPaneToLoad });
    });

    after(() => {
      cy.getAdminToken();
      // The test purges the calendar; this only cleans up if it failed before that
      deleteCalendarIfExists(testCalendarResponse?.id);
    });

    it(
      'C360952 Delete -> Purge calendars that are not assigned to any service points (helios)',
      { tags: ['smoke', 'helios', 'C360952'] },
      () => {
        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.checkCalendarExists(testCalendar.name);
        PaneActions.allCalendarsPane.clickPurgeOldCalendarsAction();
        ModalFragments.checkPurgeOldCalendarsModalExists();

        // check that all select field options are present
        ModalFragments.purgeOldCalendars.checkSelectFields();

        ModalFragments.purgeOldCalendars.purgeCalendarsEndedMoreThan({
          calendarName: testCalendar.name,
          hasServicePoint: false,
        });

        PaneActions.allCalendarsPane.checkCalendarAbsent(testCalendar.name);
      },
    );
  });
});
