import Calendar, {
  createCalendar,
  deleteCalendar,
  deleteCalendarIfExists,
  getTestCalendar,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import TopMenu from '../../support/fragments/topMenu';
import { getTestEntityValue } from '../../support/utils/stringTools';

const testCalendar = getTestCalendar();

describe('Calendar', () => {
  describe('Calendar New', () => {
    let testCalendarResponse;
    let duplicateCalendarID;
    const duplicateCalendarName = getTestEntityValue('C360953_Calendar_duplicate');

    before(() => {
      // Create data via API before the UI login: getAdminToken clears cookies,
      // which ends a UI session that is already open
      cy.getAdminToken();
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
      if (duplicateCalendarID) {
        deleteCalendar(duplicateCalendarID);
      }
    });

    it(
      'C360953 Copy -> Duplicate an existing calendar to make a new one (helios)',
      { tags: ['smoke', 'helios', 'C360953'] },
      () => {
        PaneActions.allCalendarsPane.openAllCalendarsPane();
        PaneActions.allCalendarsPane.selectCalendar(testCalendarResponse.name);
        PaneActions.individualCalendarPane.selectDuplicateAction({
          calendarName: testCalendarResponse.name,
        });

        // intercept http request; registered before the form is saved so the request isn't missed
        cy.intercept('**/calendar/calendars', (req) => {
          if (req.method === 'POST') {
            req.continue((res) => {
              expect(res.statusCode).equals(201);
              duplicateCalendarID = res.body.id;
            });
          }
        }).as('createDuplicateCalendar');

        CreateCalendarForm.editNameAndSave({ newCalendarName: duplicateCalendarName });

        // check that duplicate calendar exists in list of calendars
        cy.wait('@createDuplicateCalendar').then(() => {
          deleteCalendar(testCalendarResponse.id);
          openCalendarSettings();
          PaneActions.allCalendarsPane.openAllCalendarsPane();
          PaneActions.allCalendarsPane.checkCalendarExists(duplicateCalendarName);
        });
      },
    );
  });
});
