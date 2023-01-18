import {
  MultiColumnListCell, Modal, Pane, Button, Link, including, Select, Accordion, ListItem
} from '../../../interactors';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

// set calendar start and end date to at least 3 months ago
testCalendar.startDate = '2022-01-01';
testCalendar.endDate = '2022-01-31';
testCalendar.exceptions = [];



describe('Purge calendars that are not assigned to any service points', () => {
  before(() => {
    // login
    cy.loginAsAdmin();

    // reset db state
    cy.deleteServicePoint(testServicePoint.id, false);

    // create calendar with no service point
    testCalendar.assignments = [];
    cy.createCalendar(testCalendar);

    cy.openCalendarSettings();
  });



  it('purges old calendar that is not assigned to any service point', () => {
    cy.do([
      Pane('Calendar').find(Link('All calendars')).click(),
      Pane('All calendars').find(MultiColumnListCell(testCalendar.name)).exists(),
      Pane('All calendars').clickAction('Purge old calendars'),
      Modal('Purge old calendars').exists()
    ]);

    // check that all select options are present
    cy.do([
      Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).exists(),
      Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).choose('more than 3 months ago'),
      Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).choose('more than 6 months ago'),
      Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).choose('more than 1 year ago'),
      Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).choose('more than 2 years ago'),
    ]);

    // check that all select options are present
    cy.do([
      Modal('Purge old calendars').find(Select({ label: including('And were...') })).exists(),
      Modal('Purge old calendars').find(Select({ label: including('And were...') })).choose('not assigned to any service points'),
      Modal('Purge old calendars').find(Select({ label: including('And were...') })).choose('assigned or not assigned to service points')
    ]);


    cy.do([
      Modal('Purge old calendars').find(Select({ label: including('Purge calendars that ended...') })).choose('more than 3 months ago'),
      Modal('Purge old calendars').find(Select({ label: including('And were...') })).choose('not assigned to any service points'),
      Modal('Purge old calendars').find(Accordion('Calendars to be deleted')).clickHeader(),
      Modal('Purge old calendars').find(Accordion('Calendars to be deleted')).find(ListItem(testCalendar.name)).exists(),
      Modal('Purge old calendars').find(Button('Delete')).click(),
      Pane('All calendars').find(MultiColumnListCell(testCalendar.name)).absent()
    ]);
  });
});
