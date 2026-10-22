import { Select as BaseSelect } from '@interactors/html';
import {
  Accordion,
  Button,
  Calendar,
  HTML,
  IconButton,
  including,
  matching,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  Select,
  TextField,
  TimeDropdown,
} from '../../../../interactors';

// The form ignores a submit that comes right after the last change, leaving it open with nothing
// saved, and the DOM shows nothing to wait for until the change is processed
const clickSaveAndClose = () => {
  cy.wait(1000);
  cy.do(Button('Save and close').click());
};

export default {
  createCalendarWithoutHoursOfOperation(newCalendarInfo, servicePointName) {
    const toggleCalendarButton = HTML.extend('toggle calendar button').selector(
      'button[id^=datepicker-toggle-calendar-button-dp-]',
    );

    cy.do([
      TextField(including('Calendar name')).fillIn(newCalendarInfo.name),
      TextField(including('Start date')).find(toggleCalendarButton()).click(),
      Calendar().clickActiveDay(newCalendarInfo.startDay),
      TextField(including('End date')).find(toggleCalendarButton()).click(),
      Calendar().clickActiveDay(newCalendarInfo.endDay),
      MultiSelect({ label: 'Service points' }).choose(servicePointName),
      Accordion('Hours of operation')
        .find(MultiColumnList())
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ column: 'Actions' }))
        .find(Button({ ariaLabel: 'trash' }))
        .click(),
    ]);
    clickSaveAndClose();
  },

  create247Calendar(newCalendarInfo, servicePointName) {
    const toggleCalendarButton = HTML.extend('toggle calendar button').selector(
      'button[id^=datepicker-toggle-calendar-button-dp-]',
    );

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const [startYear, startMonth, startDay] = newCalendarInfo.startDate.split('-');
    const [endYear, endMonth, endDay] = newCalendarInfo.endDate.split('-');

    const MonthSelect = BaseSelect.extend('month select').selector('[class^=monthSelect');

    cy.do([
      TextField(including('Calendar name')).fillIn(newCalendarInfo.name),
      TextField(including('Start date')).find(toggleCalendarButton()).click(),

      Calendar({ portal: true }).exists(),
      Calendar({ portal: true }).setYear(startYear),
      Calendar({ portal: true })
        .find(MonthSelect())
        .choose(months[parseInt(startMonth, 10) - 1]),
      Calendar({ portal: true }).clickActiveDay(startDay),

      TextField(including('End date')).find(toggleCalendarButton()).click(),
      Calendar({ portal: true }).exists(),
      Calendar({ portal: true }).setYear(endYear),
      Calendar({ portal: true })
        .find(MonthSelect())
        .choose(months[parseInt(endMonth, 10) - 1]),
      Calendar({ portal: true }).clickActiveDay(endDay),

      MultiSelect({ label: 'Service points' }).choose(servicePointName),
    ]);

    cy.do([
      Accordion('Hours of operation')
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ column: 'Status' }))
        .find(Select())
        .choose('Open'),
      Accordion('Hours of operation')
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ column: 'Start day' }))
        .find(Select())
        .choose('Sunday'),
      Accordion('Hours of operation')
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ column: 'Start time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose('00:00'),
      Accordion('Hours of operation')
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ column: 'End day' }))
        .find(Select())
        .choose('Saturday'),
      Accordion('Hours of operation')
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ column: 'End time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose('23:59'),
    ]);
    clickSaveAndClose();
  },

  clickAddRowInExceptions() {
    cy.do(Accordion('Exceptions').find(Button('Add row')).click());
  },

  verifyExceptionsRowExists(rowIndex) {
    cy.expect(
      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: rowIndex }))
        .exists(),
    );
  },

  verifyExceptionsStatusDropdownOptions(rowIndex) {
    cy.expect(
      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(MultiColumnListCell({ column: 'Status' }))
        .find(Select())
        .exists(),
    );
  },

  clickPlusSignInExceptionsRow(rowIndex) {
    cy.do(
      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(MultiColumnListCell({ column: 'Actions' }))
        .find(Button({ ariaLabel: 'plus-sign' }))
        .click(),
    );
  },

  verifyOpeningsSubRowExists(rowIndex) {
    // clicking + stacks a second datepicker group inside the row's cells
    cy.get(`[data-row-index="row-${rowIndex}"] [data-test-datepicker-container]`)
      .should('have.length.gte', 2);
  },

  clickTrashInExceptionsRow(rowIndex) {
    cy.do(
      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(MultiColumnListCell({ column: 'Actions' }))
        .find(Button({ ariaLabel: 'trash' }))
        .click(),
    );
  },

  verifyOpeningsSubRowAbsent(rowIndex) {
    // trash deletes the entire exception row; the row at this index is now the "Add row" button row
    cy.expect(
      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(MultiColumnListCell({ column: 'Status' }))
        .find(Select())
        .absent(),
    );
  },

  addOpeningExceptions(addExceptionsOpeningData) {
    // index 2 is used since only 2 closure exceptions exist in the fixture
    const [startYear, startMonth, startDay] = addExceptionsOpeningData.startDate.split('-');
    const [endYear, endMonth, endDay] = addExceptionsOpeningData.endDate.split('-');

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const MonthSelect = BaseSelect.extend('month select').selector('[class^=monthSelect');

    cy.do([
      Accordion('Exceptions').find(Button('Add row')).click(),

      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: 2 }))
        .find(MultiColumnListCell({ column: 'Name' }))
        .find(TextField())
        .fillIn(addExceptionsOpeningData.name),

      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: 2 }))
        .find(MultiColumnListCell({ column: 'Status' }))
        .find(Select())
        .chooseAndBlur(addExceptionsOpeningData.status),

      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: 2 }))
        .find(MultiColumnListCell({ column: 'Start date' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^datepicker-toggle-calendar-/) }))
        .click(),
      Calendar({ portal: true }).exists(),
      Calendar({ portal: true }).setYear(startYear),
      Calendar({ portal: true })
        .find(MonthSelect())
        .choose(months[parseInt(startMonth, 10) - 1]),
      Calendar({ portal: true }).clickActiveDay(startDay),
      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: 2 }))
        .find(MultiColumnListCell({ column: 'Start time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose(addExceptionsOpeningData.startTime),

      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: 2 }))
        .find(MultiColumnListCell({ column: 'End date' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^datepicker-toggle-calendar-/) }))
        .click(),
      Calendar({ portal: true }).exists(),
      Calendar({ portal: true }).setYear(endYear),
      Calendar({ portal: true })
        .find(MonthSelect())
        .choose(months[parseInt(endMonth, 10) - 1]),
      Calendar({ portal: true }).clickActiveDay(endDay),
      Accordion('Exceptions')
        .find(MultiColumnListRow({ index: 2 }))
        .find(MultiColumnListCell({ column: 'End time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose(addExceptionsOpeningData.endTime),
    ]);

    clickSaveAndClose();
  },

  addHoursOfOperation(addHoursOfOperationData) {
    cy.do([
      Accordion('Hours of operation').find(Button('Add row')).click(),
      Accordion('Hours of operation')
        .find(MultiColumnListRow({ index: 6 }))
        .find(MultiColumnListCell({ column: 'Status' }))
        .find(Select())
        .choose(addHoursOfOperationData.status),
      Accordion('Hours of operation')
        .find(MultiColumnListRow({ index: 6 }))
        .find(MultiColumnListCell({ column: 'Start day' }))
        .find(Select())
        .choose(addHoursOfOperationData.startDay),
      Accordion('Hours of operation')
        .find(MultiColumnListRow({ index: 6 }))
        .find(MultiColumnListCell({ column: 'End day' }))
        .find(Select())
        .choose(addHoursOfOperationData.endDay),
    ]);

    // if status is open, set start time and end time
    if (addHoursOfOperationData.status === 'Open') {
      cy.do([
        Accordion('Hours of operation')
          .find(MultiColumnListRow({ index: 6 }))
          .find(MultiColumnListCell({ column: 'Start time' }))
          .find(TextField())
          .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
          .click(),
        TimeDropdown().exists(),
        TimeDropdown().setTimeAndClose(addHoursOfOperationData.startTime),
        Accordion('Hours of operation')
          .find(MultiColumnListRow({ index: 6 }))
          .find(MultiColumnListCell({ column: 'End time' }))
          .find(TextField())
          .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
          .click(),
        TimeDropdown().exists(),
        TimeDropdown().setTimeAndClose(addHoursOfOperationData.endTime),
      ]);
    }

    clickSaveAndClose();
  },

  editNameAndSave({ newCalendarName }) {
    cy.do(TextField(including('Calendar name')).fillIn(newCalendarName));
    clickSaveAndClose();
  },

  deleteHoursOfOperationAndSave() {
    cy.do([
      Accordion('Hours of operation')
        .find(MultiColumnListRow({ index: 1 }))
        .find(MultiColumnListCell({ column: 'Actions' }))
        .find(Button({ ariaLabel: 'trash' }))
        .click(),
    ]);

    cy.do([
      Accordion('Hours of operation')
        .find(MultiColumnListRow({ index: 3 }))
        .absent(),
    ]);
    clickSaveAndClose();
  },

  // Expects a calendar with one opening. The form also shows a "Closed" row for the rest of the
  // week, which is derived from the openings, so deleting the opening leaves no rows
  editExistingCalendarsAndSave(editExistingCalendarsData) {
    const hoursRowTrashButton = (index) => Accordion('Hours of operation')
      .find(MultiColumnListRow({ index }))
      .find(MultiColumnListCell({ column: 'Actions' }))
      .find(Button({ ariaLabel: 'trash' }));

    cy.do([
      TextField(including('Calendar name')).fillIn(editExistingCalendarsData.name),
      hoursRowTrashButton(0).click(),
      hoursRowTrashButton(0).absent(),
    ]);
    clickSaveAndClose();
  },

  editHoursOfOperationAndSave(editHoursOfOperationData) {
    const row = Accordion('Hours of operation').find(MultiColumnListRow({ index: 1 }));

    cy.do([
      row
        .find(MultiColumnListCell({ column: 'Start time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose(editHoursOfOperationData.startTime),
      row
        .find(MultiColumnListCell({ column: 'End time' }))
        .find(TextField())
        .find(IconButton({ id: matching(/^timepicker-toggle-button-/) }))
        .click(),
      TimeDropdown().exists(),
      TimeDropdown().setTimeAndClose(editHoursOfOperationData.endTime),
    ]);
    clickSaveAndClose();
  },
};
