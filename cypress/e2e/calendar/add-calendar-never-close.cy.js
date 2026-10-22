import Calendar, {
  deleteCalendar,
  getTestServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Calendar', () => {
  describe('Calendar New', () => {
    const testServicePoint = getTestServicePoint();
    const newCalendarInfo = {
      ...calendarFixtures.data.newCalendar,
      name: getTestEntityValue('C360955_Calendar'),
    };
    let calendarID;

    before(() => {
      // Create data via API before the UI login: getAdminToken clears cookies,
      // which ends a UI session that is already open
      cy.getAdminToken();
      ServicePoints.createViaApi(testServicePoint);

      cy.loginAsAdmin({ path: TopMenu.settingsCalendarPath, waiter: Calendar.waitCalendarPaneToLoad });
    });

    after(() => {
      cy.getAdminToken();
      if (calendarID) {
        deleteCalendar(calendarID);
      }
      ServicePoints.deleteViaApi(testServicePoint.id);
    });

    it(
      'C360955 Create -> Create calendars that are 24/7 (never close) (helios)',
      { tags: ['smoke', 'helios', 'C360955'] },
      () => {
        PaneActions.allCalendarsPane.clickNewButton();

        // intercept http request; registered before the form is saved so the request isn't missed
        cy.intercept('**/calendar/calendars', (req) => {
          if (req.method === 'POST') {
            req.continue((res) => {
              expect(res.statusCode).equals(201);
              calendarID = res.body.id;
            });
          }
        }).as('createCalendar');

        CreateCalendarForm.create247Calendar(newCalendarInfo, testServicePoint.name);

        cy.wait('@createCalendar').then(() => {
          openCalendarSettings();
          PaneActions.individualCalendarPane.checkIfOpen247(newCalendarInfo.name);
        });
      },
    );
  });
});
