import {
  MultiColumnListCell, MultiColumnListRow, TimeDropdown, Pane, Button, IconButton, TextField, Accordion,
  including, Link, matching
} from '../../../interactors';
import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

// delete all but the first opening time
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

    // reset db state
    cy.deleteServicePoint(testServicePoint.id, false);

    // create test service point
    cy.createServicePoint(testServicePoint, (response) => {
      testCalendar.assignments = [response.body.id];

      cy.createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });
      cy.openCalendarSettings();
    });

    cy.openCalendarSettings();
  });

  after(() => {
    cy.deleteServicePoint(testServicePoint.id, true);
    cy.deleteCalendar(testCalendarResponse.id);
  });


  it('edits hours of operation for an open day', () => {
    cy.do([
      Pane('Calendar').find(Link('Current calendar assignments')).click(),
      Pane('Current calendar assignments').find(MultiColumnListCell(testServicePoint.name, { column: 'Service point' })).click(),
      Pane(testCalendar.name).clickAction('Edit')
    ]);

    cy.url().should('match', /\/settings\/calendar\/active\/edit\/.+$/g);

    const row = Accordion('Hours of operation').find(MultiColumnListRow({ index: 1 }));

    cy.do([
      row.find(MultiColumnListCell({ column: 'Start time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-clear-button-/) }))
        .click(),
      row.find(MultiColumnListCell({ column: 'Start time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose(editHoursOfOperationData.startTime),
      row.find(MultiColumnListCell({ column: 'End time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-clear-button-/) }))
        .click(),
      row.find(MultiColumnListCell({ column: 'End time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose(editHoursOfOperationData.endTime),

      Button('Save and close').click()
    ]);



    // intercept http request
    cy.intercept(Cypress.env('OKAPI_HOST') + '/calendar/calendars/' + testCalendarResponse.id, (req) => {
      if (req.method === 'PUT') {
        req.continue((res) => {
          expect(res.statusCode).equals(200);
        });
      }
    }).as('editCalendar');


    cy.wait('@editCalendar').then(() => {
      cy.openCalendarSettings();
      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').find(MultiColumnListCell(testCalendar.name)).click(),
      ]);


      const hoursOfOperationStartRow = Pane(testCalendar.name).find(Accordion('Hours of operation')).find(MultiColumnListRow({ content: including(testCalendar.normalHours[0].startDay), isContainer: true }));
      const jobs = [];

      if (testCalendar.normalHours[0].startDay === testCalendar.normalHours[0].endDay) {
        jobs.push(
          hoursOfOperationStartRow.find(MultiColumnListCell({ column: 'Open', content: including(editHoursOfOperationExpectedUIValues.startTime) })).exists(),
          hoursOfOperationStartRow.find(MultiColumnListCell({ column: 'Close', content: including(editHoursOfOperationExpectedUIValues.endTime) })).exists()
        );
      } else {
        const hoursOfOperationEndRow = Pane(testCalendar.name).find(Accordion('Hours of operation')).find(MultiColumnListRow({ content: including(testCalendar.normalHours[0].endDay), isContainer: true }));

        jobs.push(
          hoursOfOperationStartRow.find(MultiColumnListCell({ column: 'Open', content: including(editHoursOfOperationExpectedUIValues.startTime) })).exists(),
          hoursOfOperationEndRow.find(MultiColumnListCell({ column: 'Close', content: including(editHoursOfOperationExpectedUIValues.endTime) })).exists()
        );
      }


      cy.do(jobs);
    });
  });
});
