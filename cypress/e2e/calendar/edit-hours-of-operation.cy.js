import { deleteServicePoint, createServicePoint, createCalendar,
  openCalendarSettings, deleteCalendar } from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

testCalendar.normalHours = [
  {
    startDay: 'Monday',
    startTime: '09:00',
    endDay: 'Thursday',
    endTime: '02:00'
  }
];

const editHoursOfOperationData = calendarFixtures.data.editHoursOfOperation;
const editHoursOfOperationExpectedUIValues = calendarFixtures.expectedUIValues.editHoursOfOperation;


describe('Edit existing hours of operation for service point', () => {
  let testCalendarResponse;
  before(() => {
    // login
    cy.loginAsAdmin();

    // get admin token to use in okapiRequest to retrieve service points
    if (!Cypress.env('token')) {
      cy.getAdminToken();
    }

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


  it('C2305 Edit -> Edit existing hours of operation for service point (bama)', { tags: [TestTypes.smoke, devTeams.bama] }, () => {
    PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();
    PaneActions.currentCalendarAssignmentsPane.selectCalendarByServicePoint(testServicePoint.name);
    PaneActions.individualCalendarPane.selectEditAction({ calendarName: testCalendar.name });

    CreateCalendarForm.editHoursOfOperationAndSave(editHoursOfOperationData);



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
      PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);

      PaneActions.individualCalendarPane.checkEditHoursOfOperation({
        calendar: testCalendar,
        editHoursOfOperationExpectedUIValues
      });
    });
  });
});
