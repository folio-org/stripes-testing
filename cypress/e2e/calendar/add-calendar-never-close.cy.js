import { Select as BaseSelect } from '@interactors/html';
import {
  TextField, HTML, Calendar, Accordion, MultiSelect, Pane, Select,
  MultiColumnListCell, MultiColumnListRow, Button, including, Link, IconButton, matching, TimeDropdown
} from '../../../interactors';

import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;
const newCalendarInfo = calendarFixtures.data.newCalendar;


const toggleCalendarButton = HTML.extend('toggle calendar button').selector('button[id^=datepicker-toggle-calendar-button-dp-]');

let calendarID;

describe('Create calendars that are 24/7 (never close)', () => {
  before(() => {
    // login
    cy.loginAsAdmin();

    // reset db state
    cy.deleteServicePoint(testServicePoint.id, false);

    // create test service point
    cy.createServicePoint(testServicePoint, (response) => {
      testCalendar.assignments = [response.body.id];
    });

    // cy.deleteCalendarUI();
    cy.openCalendarSettings();
  });

  after(() => {
    cy.deleteServicePoint(testServicePoint.id, true);
    if (calendarID) {
      cy.deleteCalendar(calendarID);
    }
  });


  it('adds new calendar', () => {
    cy.do([
      Pane('Calendar').find(Link('All calendars')).click(),
      Pane('All calendars').clickAction('New'),
    ]);

    cy.url().should('match', /\/settings\/calendar\/all\/create$/);

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const [startYear, startMonth, startDay] = newCalendarInfo.startDate.split('-');
    const [endYear, endMonth, endDay] = newCalendarInfo.endDate.split('-');

    const MonthSelect = BaseSelect.extend('month select')
      .selector('[class^=monthSelect');

    cy.do([
      TextField(including('Calendar name')).fillIn(newCalendarInfo.name),
      TextField(including('Start date')).find(toggleCalendarButton()).click(),

      Calendar({ portal: true }).exists(),
      Calendar({ portal: true }).setYear(startYear),
      Calendar({ portal: true }).find(MonthSelect()).choose(months[parseInt(startMonth, 10) - 1]),
      Calendar({ portal: true }).clickActiveDay(startDay),

      TextField(including('End date')).find(toggleCalendarButton()).click(),
      Calendar({ portal: true }).exists(),
      Calendar({ portal: true }).setYear(endYear),
      Calendar({ portal: true }).find(MonthSelect()).choose(months[parseInt(endMonth, 10) - 1]),
      Calendar({ portal: true }).clickActiveDay(endDay),

      MultiSelect({ label: 'Service points' }).choose(testServicePoint.name),
    ]);


    cy.do([
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ column: 'Status' })).find(Select())
        .choose('Open'),
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ column: 'Start day' })).find(Select())
        .choose('Monday'),
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ column: 'Start time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose('00:00'),
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ column: 'End day' })).find(Select())
        .choose('Sunday'),
      Accordion('Hours of operation').find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ column: 'End time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose('23:59'),

      Button('Save and close').click()
    ]);



    // intercept http request
    cy.intercept(Cypress.env('OKAPI_HOST') + '/calendar/calendars', (req) => {
      if (req.method === 'POST') {
        req.continue((res) => {
          expect(res.statusCode).equals(201);
          calendarID = res.body.id;
        });
      }
    }).as('createCalendar');

    const Paragraph = HTML.extend('paragraph')
      .selector('p')
      .locator((el) => el.textContent);

    // check that new calendar exists in list of calendars is displayed correctly when opened
    cy.wait('@createCalendar').then(() => {
      cy.openCalendarSettings();
      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').find(MultiColumnListCell(newCalendarInfo.name)).click(),
      ]);

      const hoursOfOperationAccordion = Pane(newCalendarInfo.name).find(Accordion('Hours of operation'));

      const jobs = [];
      const daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      daysOfTheWeek.forEach(day => {
        const row = hoursOfOperationAccordion.find(MultiColumnListRow({ content: including(day), isContainer: true }));
        jobs.push(row.exists());
        jobs.push(row.find(MultiColumnListCell({ column: 'Open', innerHTML: '<p title="This calendar is open 24/7 and does not close">–</p>' })).exists());
        jobs.push(row.find(MultiColumnListCell({ column: 'Close', innerHTML: '<p title="This calendar is open 24/7 and does not close">–</p>' })).exists());
      });

      cy.do([
        hoursOfOperationAccordion.find(Paragraph('This calendar is open 24/7 and does not close')).exists(),
        ...jobs
      ]);
    });
  });
});
