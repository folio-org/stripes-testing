import { Button, including, Link, MultiColumnListCell, Pane, PaneHeader } from '../../../../interactors';

const PaneActionButton = Button({ className: including('actionMenuToggle') });

export default {
  openCalendarWithServicePoint(servicePoint) {
    cy.do([
      Pane('Calendar').find(Link('Current calendar assignments')).click(),
      Pane('Current calendar assignments').find(MultiColumnListCell(servicePoint, { column: 'Service point' })).click(),
    ]);
  },
  allCalendarsPane: {
    clickNewButton() {
      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').clickAction('New'),
      ]);
    },
    checkActionMenuAbsent() {
      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').find(PaneActionButton).absent(),
      ]);
    },
    selectCalendar(calendarName) {
      cy.do(
        Pane('All calendars').find(MultiColumnListCell(calendarName)).click(),
      );
    },
    checkCalendarExists(calendarName) {
      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').find(MultiColumnListCell(calendarName)).exists(),
      ]);
    }
  },
  individualCalendarPane: {
    checkActionMenuAbsent(calendarName) {
      cy.do([
        Pane(calendarName).exists(),
        Pane(calendarName).find(PaneActionButton).absent()
      ]);
    },
    close(calendarName) {
      cy.do(
        Pane(calendarName).find(Button({ ariaLabel: 'Close ' + calendarName })).click()
      );
    }
  },
  currentCalendarAssignmentsPane: {
    clickNewButton() {
      cy.do(
        PaneHeader('Current calendar assignments').find(Button('New')).click()
      );
    },
    newButtonAbsent() {
      cy.do([
        Pane('Calendar').find(Link('Current calendar assignments')).click(),
        PaneHeader('Current calendar assignments').find(Button('New')).absent(),
      ]);
    },
    selectCalendar(servicePoint) {
      cy.do(
        Pane('Current calendar assignments').find(MultiColumnListCell(servicePoint)).click()
      );
    }
  }
};

