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
import { getTestEntityValue } from '../../support/utils/stringTools';

const testServicePoint = getTestServicePoint();
// A single same-day opening, which the test deletes from "Hours of operation"
const testCalendar = getTestCalendar({
  assignments: [testServicePoint.id],
  normalHours: [
    {
      startDay: 'MONDAY',
      startTime: '09:00',
      endDay: 'MONDAY',
      endTime: '17:00',
    },
  ],
});

const editExistingCalendarsData = {
  ...calendarFixtures.data.editExistingCalendars,
  name: getTestEntityValue('C360950_Calendar_edited'),
};

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
      'C360950 Edit -> Edit existing calendars (helios)',
      { tags: ['smoke', 'helios', 'C360950'] },
      () => {
        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
        PaneActions.individualCalendarPane.selectEditAction({ calendarName: testCalendar.name });
        PaneActions.individualCalendarPane.checkEditURLFromAllCalendarsPage();

        // intercept http request; registered before the form is saved so the request isn't missed
        cy.intercept(`**/calendar/calendars/${testCalendarResponse.id}`, (req) => {
          if (req.method === 'PUT') {
            req.continue((res) => {
              expect(res.statusCode).equals(200);
            });
          }
        }).as('editCalendar');

        CreateCalendarForm.editExistingCalendarsAndSave(editExistingCalendarsData);

        cy.wait('@editCalendar').then(() => {
          openCalendarSettings();
          PaneActions.allCalendarsPane.openAllCalendarsPane();
          PaneActions.allCalendarsPane.checkCalendarExists(editExistingCalendarsData.name);
          PaneActions.allCalendarsPane.selectCalendar(editExistingCalendarsData.name);

          PaneActions.individualCalendarPane.checkEditExistingCalendars(editExistingCalendarsData);
        });
      },
    );
  });
});
