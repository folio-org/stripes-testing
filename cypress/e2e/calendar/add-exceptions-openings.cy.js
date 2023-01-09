import { Select as BaseSelect } from '@interactors/html';
import {
  MultiColumnListCell, MultiColumnListRow, TimeDropdown, Pane, Button, IconButton, TextField, Accordion,
  including, Link, matching, Calendar, Select
} from '../../../interactors';


import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

const addExceptionsOpeningData = calendarFixtures.data.addExceptionsOpening;
const addExceptionsOpeningExpectedUIValues = calendarFixtures.expectedUIValues.addExceptionsOpening;



describe('Add exceptions--closures to regular hours for service point', () => {
  let testCalendarResponse;
  before(() => {
    // login
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
    // cy.deleteCalendar(testCalendarResponse.id);
  });


  it('adds new hours of operation for service point', () => {
    cy.do([
      Pane('Calendar').find(Link('Current calendar assignments')).click(),
      Pane('Current calendar assignments').find(MultiColumnListCell(testServicePoint.name, { column: 'Service point' })).click(),
      Pane(testCalendar.name).clickAction('Edit')
    ]);

    cy.url().should('match', /\/settings\/calendar\/active\/edit\/.+$/g);

    // index 2 is used since only 2 closure exceptions exist in the fixture
    const [startYear, startMonth, startDay] = addExceptionsOpeningData.startDate.split('-');
    const [endYear, endMonth, endDay] = addExceptionsOpeningData.endDate.split('-');

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const MonthSelect = BaseSelect.extend('month select')
      .selector('[class^=monthSelect');


    cy.do([
      Accordion('Exceptions').find(Button('Add row')).click(),

      Accordion('Exceptions').find(MultiColumnListRow({ index: 2 })).find(MultiColumnListCell({ column: 'Name' })).find(TextField())
        .fillIn(addExceptionsOpeningData.name),

      Accordion('Exceptions').find(MultiColumnListRow({ index: 2 })).find(MultiColumnListCell({ column: 'Status' }))
        .find(Select())
        .chooseAndBlur(addExceptionsOpeningData.status),

      Accordion('Exceptions').find(MultiColumnListRow({ index: 2 })).find(MultiColumnListCell({ column: 'Start date' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^datepicker-toggle-calendar-/) }))
        .click(),
      Calendar({ portal: true }).exists(),
      Calendar({ portal: true }).setYear(startYear),
      Calendar({ portal: true }).find(MonthSelect()).choose(months[parseInt(startMonth, 10) - 1]),
      Calendar({ portal: true }).clickActiveDay(startDay),
      Accordion('Exceptions').find(MultiColumnListRow({ index: 2 })).find(MultiColumnListCell({ column: 'Start time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose(addExceptionsOpeningData.startTime),

      Accordion('Exceptions').find(MultiColumnListRow({ index: 2 })).find(MultiColumnListCell({ column: 'End date' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^datepicker-toggle-calendar-/) }))
        .click(),
      Calendar({ portal: true }).exists(),
      Calendar({ portal: true }).setYear(endYear),
      Calendar({ portal: true }).find(MonthSelect()).choose(months[parseInt(endMonth, 10) - 1]),
      Calendar({ portal: true }).clickActiveDay(endDay),
      Accordion('Exceptions').find(MultiColumnListRow({ index: 2 })).find(MultiColumnListCell({ column: 'End time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose(addExceptionsOpeningData.endTime),
    ]);

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

      // check if new opening exception is displayed
      const row = Pane(testCalendar.name)
        .find(Accordion({ label: 'Exceptions — openings' }))
        .find(MultiColumnListRow({ content: including(addExceptionsOpeningData.name), isContainer: true }));

      cy.do(
        row.exists()
      );



      cy.do([
        row.find(
          MultiColumnListCell({
            column: 'Start',
            content: including(addExceptionsOpeningExpectedUIValues.startTime)
          })
        ).exists(),

        row.find(
          MultiColumnListCell({
            column: 'Start',
            content: including(addExceptionsOpeningExpectedUIValues.startTime)
          })
        ).exists(),

        row.find(
          MultiColumnListCell({
            column: 'Close',
            content: including(addExceptionsOpeningExpectedUIValues.endDate)
          })
        ).exists(),

        row.find(
          MultiColumnListCell({
            column: 'Close',
            content: including(addExceptionsOpeningExpectedUIValues.endTime)
          })
        ).exists()
      ]);
    });
  });
});
