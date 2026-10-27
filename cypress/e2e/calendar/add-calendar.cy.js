import Calendar, {
  createCalendar,
  deleteCalendar,
  deleteCalendarIfExists,
  getTestCalendar,
  getTestServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Calendar', () => {
  describe('Calendar New', () => {
    const testServicePoint = getTestServicePoint();
    const testCalendar = getTestCalendar({ assignments: [testServicePoint.id] });
    const newCalendarInfo = {
      name: getTestEntityValue('C360958_Calendar'),
      startDay: 1,
      endDay: 2,
    };
    let testCalendarResponse;
    let calendarID;

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
      deleteCalendarIfExists(testCalendarResponse?.id);
      if (calendarID) {
        deleteCalendar(calendarID);
      }
      ServicePoints.deleteViaApi(testServicePoint.id);
    });

    it(
      'C360958 Create -> Add new calendar for service point (helios)',
      { tags: ['smoke', 'helios', 'C360958'] },
      () => {
        PaneActions.openCalendarWithServicePoint(testServicePoint.name);
        PaneActions.individualCalendarPane.close(testCalendarResponse.name);
        PaneActions.currentCalendarAssignmentsPane.clickNewButton();

        deleteCalendar(testCalendarResponse.id);

        // intercept http request; registered before the form is saved so the request isn't missed
        cy.intercept('**/calendar/calendars', (req) => {
          if (req.method === 'POST') {
            req.continue((res) => {
              expect(res.statusCode).equals(201);
              calendarID = res.body.id;
            });
          }
        }).as('createCalendar');

        CreateCalendarForm.createCalendarWithoutHoursOfOperation(
          newCalendarInfo,
          testServicePoint.name,
        );

        // check that new calendar exists in list of calendars
        cy.wait('@createCalendar').then(() => {
          openCalendarSettings();
          PaneActions.allCalendarsPane.openAllCalendarsPane();
          PaneActions.allCalendarsPane.checkCalendarExists(newCalendarInfo.name);
        });
      },
    );
  });
});
