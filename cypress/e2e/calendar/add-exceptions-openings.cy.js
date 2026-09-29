import { Permissions } from '../../support/dictionary';
import Calendar, {
  createCalendar,
  createServicePoint,
  deleteCalendar,
  deleteServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import TopMenu from '../../support/fragments/topMenu';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

const addExceptionsOpeningData = calendarFixtures.data.addExceptionsOpening;
const addExceptionsOpeningExpectedUIValues = calendarFixtures.expectedUIValues.addExceptionsOpening;

describe('Calendar', () => {
  describe('Calendar New', () => {
    let testCalendarResponse;

    before('Create test data and login', () => {
      cy.loginAsAdmin();

      deleteServicePoint(testServicePoint.id, false);

      createServicePoint(testServicePoint, (response) => {
        testCalendar.assignments = [response.body.id];

        createCalendar(testCalendar, (calResponse) => {
          testCalendarResponse = calResponse.body;
        });
      });

      cy.createTempUser([
        Permissions.calendarView.gui,
        Permissions.calendarCreate.gui,
        Permissions.calendarDelete.gui,
        Permissions.calendarEditCalendars.gui,
      ]).then((userProperties) => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.settingsCalendarPath,
          waiter: Calendar.waitCalendarPaneToLoad,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      deleteServicePoint(testServicePoint.id, true);
      deleteCalendar(testCalendarResponse.id);
    });

    it(
      'C360951 Add exceptions--openings to regular hours for service point (helios)',
      { tags: ['smoke', 'helios', 'C360951'] },
      () => {
        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByServicePoint(
          testServicePoint.name,
        );
        PaneActions.currentCalendarAssignmentsPane.clickEditAction(testCalendar.name);

        // #3 Click "Add row" in Exceptions section => New row is added
        CreateCalendarForm.clickAddRowInExceptions();
        CreateCalendarForm.verifyExceptionsRowExists(2);

        // #4 Click on "Status" drop-down => Drop-down opens with "Open" and "Closed" options
        CreateCalendarForm.verifyExceptionsStatusDropdownOptions(2);

        // #5 Select "Open" is covered inside addOpeningExceptions

        // #6 Click "+" in Actions column => New opening row added with date/time fields
        CreateCalendarForm.clickPlusSignInExceptionsRow(2);
        CreateCalendarForm.verifyOpeningsSubRowExists(2);

        // #7 Click "Trash" in Actions column => Exception row is deleted
        CreateCalendarForm.clickTrashInExceptionsRow(2);
        CreateCalendarForm.verifyOpeningsSubRowAbsent(2);

        // intercept must be set up before save is triggered inside addOpeningExceptions
        cy.intercept(
          Cypress.env('OKAPI_HOST') + '/calendar/calendars/' + testCalendarResponse.id,
          (req) => {
            if (req.method === 'PUT') {
              req.continue((res) => {
                expect(res.statusCode).equals(200);
              });
            }
          },
        ).as('updateCalendar');

        CreateCalendarForm.addOpeningExceptions(addExceptionsOpeningData);

        cy.wait('@updateCalendar').then(() => {
          openCalendarSettings();
          PaneActions.allCalendarsPane.openAllCalendarsPane();
          PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);

          PaneActions.individualCalendarPane.checkOpeningExceptions({
            calendarName: testCalendar.name,
            addExceptionsOpeningData,
            addExceptionsOpeningExpectedUIValues,
          });
        });
      },
    );
  });
});
