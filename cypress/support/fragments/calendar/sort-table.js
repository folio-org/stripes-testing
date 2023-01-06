import { MultiColumnListCell, MultiColumnListRow, Pane } from '../../../../interactors';
import CalendarSortTableTools from '../../utils/uiCalendar_SortTableTools';



export const assertCalendarsIsProperlySorted = (calendars, sortProperty) => {
  const jobs = [];
  const sortPropertyToHeaderName = {
    calendarName: 'Calendar name',
    startDate: 'Start date',
    endDate: 'End date',
    assignments: 'Assignments'
  };

  calendars.forEach((calendar, index) => {
    let cellValue;
    if (sortProperty === 'startDate' || sortProperty === 'endDate') {
      const [year, month, day] = calendar[sortProperty].split('-');
      cellValue = `${month[0] === '0' ? month.slice(1) : month}/${day[0] === '0' ? day.slice(1) : day}/${year}`;
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
      Pane('All calendars').find(MultiColumnListRow({ index })).find(
        MultiColumnListCell({ column: 'Calendar name', content: calendar.name })
      ).exists()
    );

    if (sortProperty !== 'calendarName') {
      jobs.push(
        Pane('All calendars').find(MultiColumnListRow({ index })).find(
          MultiColumnListCell({ column: sortPropertyToHeaderName[sortProperty], content: cellValue })
        ).exists()
      );
    }
  });

  cy.do(jobs);
};

export const assertRowsAreProperlySorted = (rows, sortProperty) => {
  const jobs = [];
  const sortPropertyToHeaderName = {
    servicePoint: 'Service point',
    startDate: 'Start date',
    endDate: 'End date',
    calendarName: 'Calendar name',
    currentStatus: 'Current status'
  };

  rows.forEach((row, index) => {
    const cellValue = row[sortProperty];

    jobs.push(
      Pane('Current calendar assignments').find(MultiColumnListRow({ index })).exists(),
      Pane('Current calendar assignments').find(MultiColumnListRow({ index })).find(
        MultiColumnListCell({ column: 'Service point', content: row.servicePoint })
      ).exists(),
    );

    if (sortProperty !== 'servicePoint') {
      jobs.push(
        Pane('Current calendar assignments').find(MultiColumnListRow({ index })).find(
          MultiColumnListCell({ column: sortPropertyToHeaderName[sortProperty], content: cellValue })
        ).exists(),
      );
    }
  });

  cy.do(jobs);
};
