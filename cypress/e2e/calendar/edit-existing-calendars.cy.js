import { deleteServicePoint, createServicePoint, createCalendar,
  openCalendarSettings, deleteCalendar } from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

// delete all but the first opening time
testCalendar.normalHours.splice(1);

const editExistingCalendarsData = calendarFixtures.data.editExistingCalendars;


describe('Edit existing calendars', () => {
  let testCalendarResponse;
  before(() => {
    // login
    cy.loginAsAdmin();

    // get admin token to use in okapiRequest to retrieve service points
    cy.getAdminToken();

    // reset db state
    deleteServicePoint(testServicePoint.id, false);

    // create test service point
    createServicePoint(testServicePoint, (response) => {
      testCalendar.assignments = [response.body.id];

      createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });
      openCalendarSettings();
    });
  });

  after(() => {
    deleteServicePoint(testServicePoint.id, true);
    deleteCalendar(testCalendarResponse.id);
  });


  it('C360950 Edit -> Edit existing calendars (bama)', { tags: [TestTypes.smoke, devTeams.bama] }, () => {
    PaneActions.allCalendarsPane.openAllCalendarsPane();
    PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
    PaneActions.individualCalendarPane.selectEditAction({ calendarName: testCalendar.name });

    CreateCalendarForm.editExistingCalendarsAndSave(editExistingCalendarsData);

    // intercept http request
    cy.intercept(Cypress.env('OKAPI_HOST') + '/calendar/calendars/' + testCalendarResponse.id, (req) => {
      if (req.method === 'PUT') {
        req.continue((res) => {
          expect(res.statusCode).equals(200);
        });
      }
    }).as('editCalendar');


    cy.wait('@editCalendar').then(() => {
      openCalendarSettings();
      PaneActions.allCalendarsPane.openAllCalendarsPane();
      PaneActions.allCalendarsPane.checkCalendarExists(editExistingCalendarsData.name);
      PaneActions.allCalendarsPane.selectCalendar(editExistingCalendarsData.name);

      PaneActions.individualCalendarPane.checkEditExistingCalendars(editExistingCalendarsData);
    });
  });
});
