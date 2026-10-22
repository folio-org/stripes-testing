import Calendar, {
  createCalendar,
  deleteCalendar,
  getTestCalendar,
  getTestServicePoint,
} from '../../support/fragments/calendar/calendar';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import { assertRowsAreProperlySorted } from '../../support/fragments/calendar/sort-table';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';
import getCurrentStatus from '../../support/utils/uiCalendar_CalendarUtils';
import CalendarSortTableTools from '../../support/utils/uiCalendar_SortTableTools';

const isBetweenDatesByDay = CalendarSortTableTools.date.isBetweenDatesByDay;
const dateFromYYYYMMDD = CalendarSortTableTools.date.dateFromYYYYMMDD;

const addSort = CalendarSortTableTools.sortableMultiColumnList.addSort;
const sortRows = CalendarSortTableTools.sortCurrentCalendarAssignments.sortRows;

const testServicePoint = getTestServicePoint();
const testCalendar = getTestCalendar({ assignments: [testServicePoint.id] });

const getLocalizedDate = DateTools.uiCalendar.getLocalizedDate;

describe('Calendar', () => {
  describe('Calendar New', () => {
    let testCalendarResponse;
    before(() => {
      // Create data via API before the UI login: getAdminToken clears cookies,
      // which ends a UI session that is already open
      cy.getAdminToken();
      ServicePoints.createViaApi(testServicePoint);
      createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });

      cy.loginAsAdmin({ path: TopMenu.settingsCalendarPath, waiter: Calendar.waitCalendarPaneToLoad });
    });

    after(() => {
      cy.getAdminToken();
      if (testCalendarResponse) {
        deleteCalendar(testCalendarResponse.id);
      }
      ServicePoints.deleteViaApi(testServicePoint.id);
    });

    it(
      'C360960 Sort headings on "Current calendar assignments" tab (helios)',
      { tags: ['smoke', 'helios', 'C360960'] },
      () => {
        const calendars = [];
        const servicePoints = [];

        // Build the expected rows from the same responses the UI renders, so calendars or service
        // points that other specs create or delete in the meantime can't make them differ
        cy.intercept('GET', '**/calendar/calendars?*').as('getCalendars');
        cy.intercept('GET', '**/service-points?*').as('getServicePoints');

        PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();

        cy.wait(['@getCalendars', '@getServicePoints']).then(([calendarsCall, servicePointsCall]) => {
          calendars.push(...calendarsCall.response.body.calendars);
          servicePoints.push(...servicePointsCall.response.body.servicepoints);

          // use servicePoints and calendars data to build the list of rows in the table
          // baseRows is the list of rows in the order in which they are built initially
          const baseRows = servicePoints.map((servicePoint) => {
            const filteredCalendars = calendars.filter((calendar) => {
              return (
                isBetweenDatesByDay(
                  new Date(),
                  dateFromYYYYMMDD(calendar.startDate),
                  dateFromYYYYMMDD(calendar.endDate),
                ) && calendar.assignments.includes(servicePoint.id)
              );
            });
            if (filteredCalendars.length === 0) {
              return {
                servicePoint: servicePoint.name.concat(
                  servicePoint.inactive ? ' (inactive)' : '',
                ),
                servicePointId: servicePoint.id,
                calendarName: 'None',
                startDate: '',
                startDateObj: undefined,
                endDate: '',
                endDateObj: undefined,
                currentStatus: 'Closed',
                calendar: null,
              };
            }
            return {
              servicePointId: servicePoint.id,
              servicePoint: servicePoint.name.concat(servicePoint.inactive ? ' (inactive)' : ''),
              calendarName: filteredCalendars[0].name,
              startDate: getLocalizedDate(filteredCalendars[0].startDate),
              startDateObj: dateFromYYYYMMDD(filteredCalendars[0].startDate),
              endDate: getLocalizedDate(filteredCalendars[0].endDate),
              endDateObj: dateFromYYYYMMDD(filteredCalendars[0].endDate),
              currentStatus: getCurrentStatus(new Date(Date.now()), filteredCalendars[0]),
              calendar: filteredCalendars[0],
            };
          });

          // currentRows is the list of rows resulting from the sorting of baseRows using the primary and secondary sort
          let currentRows;

          // 'sorts' contains the primary and secondary sort
          // The SortableMultiColumnList component uses a primary sort and an optional secondary sort to sort its data
          // see 'addSort' for how this sorts array is updated
          let sorts = [];

          // check for sorting by service point name in ascending order
          sorts = addSort(sorts, 'servicePoint');
          currentRows = sortRows(baseRows, sorts);
          assertRowsAreProperlySorted(currentRows, 'servicePoint');

          // check for sorting by service point name in descending order
          PaneActions.calendarTable.clickServicePointHeader();

          sorts = addSort(sorts, 'servicePoint');
          currentRows = sortRows(baseRows, sorts);
          assertRowsAreProperlySorted(currentRows, 'servicePoint');

          // sort in ascending order by calendar name
          PaneActions.calendarTable.clickCalendarNameHeader();

          sorts = addSort(sorts, 'calendarName');
          currentRows = sortRows(baseRows, sorts);
          assertRowsAreProperlySorted(currentRows, 'calendarName');

          // sort in descending order by calendar name
          PaneActions.calendarTable.clickCalendarNameHeader();

          sorts = addSort(sorts, 'calendarName');
          currentRows = sortRows(baseRows, sorts);
          assertRowsAreProperlySorted(currentRows, 'calendarName');

          // sort in ascending order by start date
          PaneActions.calendarTable.clickStartDateHeader();

          sorts = addSort(sorts, 'startDate');
          currentRows = sortRows(baseRows, sorts);
          assertRowsAreProperlySorted(currentRows, 'startDate');

          // sort in descending order by start date
          PaneActions.calendarTable.clickStartDateHeader();

          sorts = addSort(sorts, 'startDate');
          currentRows = sortRows(baseRows, sorts);
          assertRowsAreProperlySorted(currentRows, 'startDate');

          // sort in ascending order by end date
          PaneActions.calendarTable.clickEndDateHeader();

          sorts = addSort(sorts, 'endDate');
          currentRows = sortRows(baseRows, sorts);
          assertRowsAreProperlySorted(currentRows, 'endDate');

          // sort in descending order by end date
          PaneActions.calendarTable.clickEndDateHeader();

          sorts = addSort(sorts, 'endDate');
          currentRows = sortRows(baseRows, sorts);
          assertRowsAreProperlySorted(currentRows, 'endDate');

          // sort in ascending order by status
          PaneActions.calendarTable.clickCurrentStatusHeader();

          sorts = addSort(sorts, 'currentStatus');
          currentRows = sortRows(baseRows, sorts);
          assertRowsAreProperlySorted(currentRows, 'currentStatus');

          // sort in descending order by status
          PaneActions.calendarTable.clickCurrentStatusHeader();

          sorts = addSort(sorts, 'currentStatus');
          currentRows = sortRows(baseRows, sorts);
          assertRowsAreProperlySorted(currentRows, 'currentStatus');
        });
      },
    );
  });
});
