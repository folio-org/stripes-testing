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
const testCalendar = getTestCalendar({ assignments: [testServicePoint.id] });
const addHoursOfOperationData = calendarFixtures.data.addHoursOfOperation;
const addHoursOfOperationExpectedUIValues = calendarFixtures.expectedUIValues.addHoursOfOperation;

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
      if (testCalendarResponse) {
        deleteCalendar(testCalendarResponse.id);
      }
      ServicePoints.deleteViaApi(testServicePoint.id);
    });

    it(
      'C360942 Edit -> Add new hours of operation for service point (helios)',
      { tags: ['smoke', 'helios', 'C360942'] },
      () => {
        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByServicePoint(
          testServicePoint.name,
        );
        PaneActions.currentCalendarAssignmentsPane.clickEditAction(testCalendar.name);

        // intercept http request; registered before the form is saved so the request isn't missed
        cy.intercept(`**/calendar/calendars/${testCalendarResponse.id}`, (req) => {
          if (req.method === 'PUT') {
            req.continue((res) => {
              expect(res.statusCode).equals(200);
            });
          }
        }).as('updateCalendar');

        CreateCalendarForm.addHoursOfOperation(addHoursOfOperationData);

        // check that new calendar exists in list of calendars
        cy.wait('@updateCalendar').then(() => {
          openCalendarSettings();
          PaneActions.allCalendarsPane.openAllCalendarsPane();
          PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);

          PaneActions.individualCalendarPane.checkHoursOfOperation({
            calendarName: testCalendar.name,
            addHoursOfOperationExpectedUIValues,
          });
        });
      },
    );
  });
});
