import Calendar, {
  createCalendar,
  deleteCalendar,
  getTestCalendar,
  getTestServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';

// delete all but the first opening time
const testOpeningHours = {
  startDay: 'Monday',
  startTime: '09:00',
  endDay: 'Thursday',
  endTime: '13:00',
};
const testServicePoint = getTestServicePoint();
const testCalendar = getTestCalendar({
  assignments: [testServicePoint.id],
  normalHours: [testOpeningHours],
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
      'C2306 Delete -> Delete existing hours of operation for service point (helios)',
      { tags: ['smoke', 'helios', 'C2306'] },
      () => {
        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByServicePoint(
          testServicePoint.name,
        );
        PaneActions.individualCalendarPane.selectEditAction({ calendarName: testCalendar.name });
        PaneActions.individualCalendarPane.checkEditURLFromCurrentAssignmentsPage();

        // intercept http request; registered before the form is saved so the request isn't missed
        cy.intercept(`**/calendar/calendars/${testCalendarResponse.id}`, (req) => {
          if (req.method === 'PUT') {
            req.continue((res) => {
              expect(res.statusCode).equals(200);
            });
          }
        }).as('editCalendar');

        CreateCalendarForm.deleteHoursOfOperationAndSave();

        cy.wait('@editCalendar').then(() => {
          openCalendarSettings();
          PaneActions.allCalendarsPane.openAllCalendarsPane();
          PaneActions.allCalendarsPane.checkCalendarExists(testCalendar.name);
          PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);

          PaneActions.individualCalendarPane.checkDeleteHoursOfOperation({
            calendarName: testCalendar.name,
            openingHoursData: testOpeningHours,
          });
        });
      },
    );
  });
});
