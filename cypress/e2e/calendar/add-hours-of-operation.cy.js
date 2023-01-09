import { Select } from '@interactors/html';
import {
  MultiColumnListCell, MultiColumnListRow, TimeDropdown, Pane, Button, IconButton, TextField, Accordion,
  including, Link, matching
} from '../../../interactors';
import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;
const addHoursOfOperationData = calendarFixtures.data.addHoursOfOperation;
const addHoursOfOperationExpectedUIValues = calendarFixtures.expectedUIValues.addHoursOfOperation;


describe('Add new hours of operation for service point', () => {
  let testCalendarResponse;
  before(() => {
    // login and open calendar settings
    cy.openCalendarSettings(false);

    // reset db state
    cy.deleteServicePoint(testServicePoint.id, false);

    // create test service point and calendar
    cy.createServicePoint(testServicePoint, (response) => {
      testCalendar.assignments = [response.body.id];

      cy.createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });
      cy.openCalendarSettings();
    });
  });


  after(() => {
    // delete test calendar
    cy.deleteCalendar(testCalendarResponse.id);
  });


  it('adds new hours of operation for service point', () => {
    cy.do([
      Pane('Calendar').find(Link('Current calendar assignments')).click(),
      Pane('Current calendar assignments').find(MultiColumnListCell(testServicePoint.name, { column: 'Service point' })).click(),
      Pane(testCalendar.name).clickAction('Edit')
    ]);

    cy.url().should('match', /\/settings\/calendar\/active\/edit\/.+$/g);

    cy.do([
      Accordion('Hours of operation').find(Button('Add row')).click(),
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 6 })).find(MultiColumnListCell({ column: 'Status' })).find(Select())
        .choose(addHoursOfOperationData.status),
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 6 })).find(MultiColumnListCell({ column: 'Start day' })).find(Select())
        .choose(addHoursOfOperationData.startDay),
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 6 })).find(MultiColumnListCell({ column: 'End day' })).find(Select())
        .choose(addHoursOfOperationData.endDay),
    ]);

    // if status is open, set start time and end time
    if (addHoursOfOperationData.status === 'Open') {
      cy.do([
        Accordion('Hours of operation').find(MultiColumnListRow({ index: 6 })).find(MultiColumnListCell({ column: 'Start time' }))
          .find(TextField())
          .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
          .click(),
        TimeDropdown().exists(),
        TimeDropdown().setTimeAndClose(addHoursOfOperationData.startTime),
        Accordion('Hours of operation').find(MultiColumnListRow({ index: 6 })).find(MultiColumnListCell({ column: 'End time' }))
          .find(TextField())
          .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
          .click(),
        TimeDropdown().exists(),
        TimeDropdown().setTimeAndClose(addHoursOfOperationData.endTime),
      ]);
    }

    cy.do(
      Button('Save and close').click()
    );

    // intercept http request
    cy.intercept(Cypress.env('OKAPI_HOST') + '/calendar/calendars/' + testCalendarResponse.id, (req) => {
      if (req.method === 'PUT') {
        req.continue((res) => {
          expect(res.statusCode).equals(200);
        });
      }
    }).as('updateCalendar');

    // check that new calendar exists in list of calendars
    cy.wait('@updateCalendar').then(() => {
      cy.openCalendarSettings();
      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').find(MultiColumnListCell(testCalendar.name)).click()
      ]);

      const jobs = [];

      Object.keys(addHoursOfOperationExpectedUIValues).forEach(day => {
        const row = Pane(testCalendar.name)
          .find(Accordion('Hours of operation'))
          .find(MultiColumnListRow({ content: including(day), isContainer: true }));
        jobs.push(
          row.find(MultiColumnListCell({
            column: 'Open',
            content: including(addHoursOfOperationExpectedUIValues[day].startTime)
          }))
            .exists(),
          row.find(MultiColumnListCell({
            column: 'Close',
            content: including(addHoursOfOperationExpectedUIValues[day].endTime)
          }))
            .exists()
        );
      });

      cy.do(jobs);
    });
  });
});
