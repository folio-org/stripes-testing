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

      cy.loginAsAdmin({ path: TopMenu.settingsCalendarPath, waiter: Calendar.waitCalendarPaneToLoad });
    });

    after(() => {
      cy.getAdminToken();
      // The test deletes the calendar; this only cleans up if it failed before that
      deleteCalendarIfExists(testCalendarResponse?.id);
      ServicePoints.deleteViaApi(testServicePoint.id);
    });

    it('C360943 Delete -> Delete existing calendar (helios)', { tags: ['smoke', 'helios', 'C360943'] }, () => {
      PaneActions.allCalendarsPane.openAllCalendarsPane();
      PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
      PaneActions.individualCalendarPane.selectDeleteAction({
        calendarName: testCalendar.name,
      });
      ModalFragments.checkCalendarDeletionModalWithCancelButton();

      PaneActions.individualCalendarPane.checkIndividualCalendarPaneExists(testCalendar.name);
      PaneActions.individualCalendarPane.selectDeleteAction({
        calendarName: testCalendar.name,
      });
      ModalFragments.checkCalendarDeletionModalWithDismiss();

      PaneActions.individualCalendarPane.selectDeleteAction({
        calendarName: testCalendar.name,
      });
      ModalFragments.checkCalendarDeletionModalExists();
      ModalFragments.clickDeleteButtonOnCalendarDeletionModal();
      PaneActions.allCalendarsPane.checkCalendarAbsent(testCalendar.name);
    });
  });
});
