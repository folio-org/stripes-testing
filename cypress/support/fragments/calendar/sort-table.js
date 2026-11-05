import { MultiColumnListCell, MultiColumnListRow, Pane } from '../../../../interactors';
import CalendarSortTableTools from '../../utils/uiCalendar_SortTableTools';

export const assertCalendarsIsProperlySorted = (calendars, sortProperty) => {
  const jobs = [];
  const sortPropertyToHeaderName = {
    calendarName: 'Calendar name',
    startDate: 'Start date',
    endDate: 'End date',
    assignments: 'Assignments',
  };

  calendars.forEach((calendar, index) => {
    let cellValue;
    if (sortProperty === 'startDate' || sortProperty === 'endDate') {
      const [year, month, day] = calendar[sortProperty].split('-');
      cellValue = `${month[0] === '0' ? month.slice(1) : month}/${
        day[0] === '0' ? day.slice(1) : day
      }/${year}`;
    } else if (sortProperty === 'assignments') {
      if (calendar.assignments.length > 0) {
        cellValue = CalendarSortTableTools.sortAllCalendars.getCalendarAssignmentsString(calendar);
      } else {
        cellValue = 'None';
      }
    } else if (sortProperty === 'calendarName') {
      cellValue = calendar.name;
    } else {
      cellValue = calendar[sortProperty];
    }

    jobs.push(
      Pane('All calendars').find(MultiColumnListRow({ index })).exists(),
      Pane('All calendars')
        .find(MultiColumnListRow({ index }))
        .find(MultiColumnListCell({ column: 'Calendar name', content: calendar.name }))
        .exists(),
    );

    if (sortProperty !== 'calendarName') {
      jobs.push(
        Pane('All calendars')
          .find(MultiColumnListRow({ index }))
          .find(
            MultiColumnListCell({
              column: sortPropertyToHeaderName[sortProperty],
              content: cellValue,
            }),
          )
          .exists(),
      );
    }
  });

  cy.do(jobs);
};

export const assertRowsAreProperlySorted = (rows, sortProperty) => {
  const columnNames = [
    'Service point',
    'Calendar name',
    'Start date',
    'End date',
    'Current status',
  ];
  const sortPropertyToColumnIndex = {
    servicePoint: 0,
    calendarName: 1,
    startDate: 2,
    endDate: 3,
    currentStatus: 4,
  };
  const columnsToCheck = [...new Set([0, sortPropertyToColumnIndex[sortProperty]])];

  // The table can hold dozens of rows, so it is compared in one command: a check per row
  // produces so many steps that writing the Allure results after the test times out.
  // Errors thrown here are retried until the table matches or the timeout is reached.
  cy.do(
    Pane('Current calendar assignments').perform((pane) => {
      rows.forEach((row, index) => {
        const rowElement = pane.querySelector(`[data-row-inner="${index}"]`);
        if (!rowElement) throw new Error(`Row with index ${index} is not found`);

        const cells = [...rowElement.querySelectorAll('div[class*=mclCell-]')];
        columnsToCheck.forEach((columnIndex) => {
          const expected = columnIndex === 0 ? row.servicePoint : row[sortProperty];
          const actual = cells[columnIndex]?.textContent;
          if (actual !== expected) {
            throw new Error(
              `Row ${index}, column "${columnNames[columnIndex]}": expected "${expected}", but found "${actual}"`,
            );
          }
        });
      });
    }),
  );
};
