import Calendar, {
  createCalendar,
  deleteCalendar,
  getTestCalendar,
  getTestServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';

const testServicePoint = getTestServicePoint();
const testCalendar = getTestCalendar({
  assignments: [testServicePoint.id],
  normalHours: [
    {
      startDay: 'Monday',
      startTime: '09:00',
      endDay: 'Thursday',
      endTime: '02:00',
    },
  ],
});

const editHoursOfOperationData = calendarFixtures.data.editHoursOfOperation;
const editHoursOfOperationExpectedUIValues = calendarFixtures.expectedUIValues.editHoursOfOperation;

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
      'C2305 Edit -> Edit existing hours of operation for service point (helios)',
      { tags: ['smoke', 'helios', 'C2305'] },
      () => {
        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByServicePoint(
          testServicePoint.name,
        );
        PaneActions.individualCalendarPane.selectEditAction({ calendarName: testCalendar.name });

        // intercept http request; registered before the form is saved so the request isn't missed
        cy.intercept(`**/calendar/calendars/${testCalendarResponse.id}`, (req) => {
          if (req.method === 'PUT') {
            req.continue((res) => {
              expect(res.statusCode).equals(200);
            });
          }
        }).as('editCalendar');

        CreateCalendarForm.editHoursOfOperationAndSave(editHoursOfOperationData);

        cy.wait('@editCalendar').then(() => {
          openCalendarSettings();
          PaneActions.allCalendarsPane.openAllCalendarsPane();
          PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);

          PaneActions.individualCalendarPane.checkEditHoursOfOperation({
            calendar: testCalendar,
            editHoursOfOperationExpectedUIValues,
          });
        });
      },
    );
  });
});
