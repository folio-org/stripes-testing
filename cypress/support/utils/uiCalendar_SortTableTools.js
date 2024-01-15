/**
 * utility functions for ui-calendar automated UI testing
 */

import DateTools from './dateTools';

const { dateFromYYYYMMDD, toStartOfDay } = DateTools.uiCalendar;

function getCalendarAssignmentsString(calendar) {
  let result = '';
  const numAssignments = calendar.assignments.length;
  if (numAssignments > 0) {
    if (numAssignments === 1) {
      result = calendar.assignments[0];
    } else if (numAssignments === 2) {
      result = calendar.assignments[0] + ' and ' + calendar.assignments[1];
    } else {
      const lastAssignment =
        numAssignments > 1 ? ', and ' + calendar.assignments[numAssignments - 1] : '';
      result = calendar.assignments.slice(0, -1).join(', ') + lastAssignment;
    }
  }
  return result;
}

export default {
  // functions related to SortableMultiColumnList component in ui-calendar
  sortableMultiColumnList: {
    // add a 'sort' to the sortsArray specified
    addSort(sortsArray, sortProperty) {
      let result = [];
      sortsArray.forEach((sort) => {
        result.push({ ...sort });
      });
      if (result.length >= 1 && result[0].sortProperty === sortProperty) {
        // toggling the primary sort
        result[0].inAscendingOrder = !result[0].inAscendingOrder;
      } else if (result.length <= 1) {
        // new sort, no secondary
        result = [{ inAscendingOrder: true, sortProperty }, ...result];
      } else {
        // old primary is the new secondary
        // if sort[1] was the clicked header, it is replaced, so no worry about the
        // two sorts being the same key
        result = [{ inAscendingOrder: true, sortProperty }, result[0]];
      }

      return result;
    },
  },
  sortAllCalendars: {
    // given a calendar object with a list of assignments,
    // this function returns a containing the list of assignments, comma-separated.
    getCalendarAssignmentsString,

    // returns the resulting of sorting 'rows' using the sorts specified in the 'sorts' array
    sortCalendars(rows, sorts) {
      const rowsCopy = [];
      rows.forEach((row) => {
        rowsCopy.push({ ...row });
      });

      for (let i = sorts.length - 1; i >= 0; --i) {
        const sort = sorts[i];

        const multiplier = sort.inAscendingOrder ? 1 : -1;
        switch (sort.sortProperty) {
          case 'calendarName':
            rowsCopy.sort((firstRow, secondRow) => {
              return multiplier * firstRow.name.localeCompare(secondRow.name);
            });
            break;
          case 'startDate':
            rowsCopy.sort((firstRow, secondRow) => {
              return (
                multiplier *
                Math.sign(
                  new Date(firstRow.startDate).getTime() - new Date(secondRow.startDate).getTime(),
                )
              );
            });
            break;
          case 'endDate':
            rowsCopy.sort((firstRow, secondRow) => {
              return (
                multiplier *
                Math.sign(
                  new Date(firstRow.endDate).getTime() - new Date(secondRow.endDate).getTime(),
                )
              );
            });
            break;
          case 'assignments':
            rowsCopy.sort((firstRow, secondRow) => {
              if (firstRow.assignments.length === 0) {
                return multiplier * -1;
              }
              if (secondRow.assignments.length === 0) {
                return multiplier * 1;
              }

              const firstRowAssignmentsString = getCalendarAssignmentsString(firstRow);
              const secondRowAssignmentsString = getCalendarAssignmentsString(secondRow);

              return (
                multiplier * firstRowAssignmentsString.localeCompare(secondRowAssignmentsString)
              );
            });
            break;
          default:
            break;
        }
      }

      return rowsCopy;
    },
  },
  sortCurrentCalendarAssignments: {
    sortRows(rows, sorts) {
      const rowsCopy = [];
      rows.forEach((row) => {
        rowsCopy.push({ ...row });
      });

      for (let i = sorts.length - 1; i >= 0; --i) {
        const sort = sorts[i];

        const multiplier = sort.inAscendingOrder ? 1 : -1;
        switch (sort.sortProperty) {
          case 'servicePoint':
            rowsCopy.sort((firstRow, secondRow) => {
              return multiplier * firstRow.servicePoint.localeCompare(secondRow.servicePoint);
            });
            break;
          case 'startDate':
            rowsCopy.sort((firstRow, secondRow) => {
              if (firstRow.calendar === null && secondRow.calendar === null) {
                return 0;
              } else if (firstRow.calendar === null) {
                return multiplier * -1;
              } else if (secondRow.calendar === null) {
                return multiplier * 1;
              } else {
                return (
                  multiplier *
                  Math.sign(
                    new Date(firstRow.startDateObj).getTime() -
                      new Date(secondRow.startDateObj).getTime(),
                  )
                );
              }
            });
            break;
          case 'endDate':
            rowsCopy.sort((firstRow, secondRow) => {
              if (firstRow.calendar === null && secondRow.calendar === null) {
                return 0;
              } else if (firstRow.calendar === null) {
                return multiplier * -1;
              } else if (secondRow.calendar === null) {
                return multiplier * 1;
              } else {
                return (
                  multiplier *
                  Math.sign(
                    new Date(firstRow.endDateObj).getTime() -
                      new Date(secondRow.endDateObj).getTime(),
                  )
                );
              }
            });
            break;
          case 'calendarName':
            rowsCopy.sort((firstRow, secondRow) => {
              if (firstRow.calendar === null && secondRow.calendar === null) {
                return 0;
              } else if (firstRow.calendar === null) {
                return multiplier * -1;
              } else if (secondRow.calendar === null) {
                return multiplier * 1;
              } else {
                return multiplier * firstRow.calendarName.localeCompare(secondRow.calendarName);
              }
            });
            break;
          case 'currentStatus':
            rowsCopy.sort((firstRow, secondRow) => {
              return multiplier * firstRow.currentStatus.localeCompare(secondRow.currentStatus);
            });
            break;
          default:
            break;
        }
      }
      return rowsCopy;
    },
  },
  date: {
    isBetweenDatesByDay(test, left, right) {
      const testStart = toStartOfDay(test);
      const leftStart = toStartOfDay(left);
      const rightStart = toStartOfDay(right);

      return leftStart <= testStart && testStart <= rightStart;
    },

    dateFromYYYYMMDD,
  },
};
