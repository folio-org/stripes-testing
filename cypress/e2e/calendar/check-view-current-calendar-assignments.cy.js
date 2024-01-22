import {
  createCalendar,
  createServicePoint,
  deleteCalendar,
  deleteServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import {
  checkCalendarFields,
  checkExpandButton,
  checkMenuAction,
} from '../../support/fragments/calendar/calendar-info-pane';

import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

describe('Calendar', () => {
  describe('Calendar New', () => {
    let testCalendarResponse;

    before(() => {
      // login and open calendar settings
      cy.loginAsAdmin();

      // get admin token to use in okapiRequest to retrieve service points
      if (!Cypress.env('token')) {
        cy.getAdminToken();
      }

      // reset db state
      deleteServicePoint(testServicePoint.id, false);

      // create test service point and calendar
      createServicePoint(testServicePoint, (response) => {
        testCalendar.assignments = [response.body.id];

        createCalendar(testCalendar, (calResponse) => {
          testCalendarResponse = calResponse.body;
        });
      });
    });

    beforeEach(() => {
      openCalendarSettings();
      PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
    });

    after(() => {
      // delete test calendar
      deleteCalendar(testCalendarResponse.id);
    });

    it(
      'C360941 Checking the view of calendar on "Current calendar assignments" tab (bama)',
      { tags: ['smoke', 'bama'] },
      () => {
        PaneActions.currentCalendarAssignmentsPane.checkNewButtonExists();
        PaneActions.currentCalendarAssignmentsPane.checkCalendarWithServicePointExists(
          testServicePoint.name,
        );

        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByCalendarName(
          testCalendarResponse.name,
        );
        checkCalendarFields(testCalendar, testServicePoint);

        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByCalendarName(
          testCalendarResponse.name,
        );
        checkExpandButton();

        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
        PaneActions.currentCalendarAssignmentsPane.selectCalendarByCalendarName(
          testCalendarResponse.name,
        );
        checkMenuAction(testCalendarResponse.name);
      },
    );
  });
});
