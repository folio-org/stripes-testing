import {
  createCalendar,
  createServicePoint,
  deleteCalendar,
  deleteServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import { assertRowsAreProperlySorted } from '../../support/fragments/calendar/sort-table';
import DateTools from '../../support/utils/dateTools';
import getCurrentStatus from '../../support/utils/uiCalendar_CalendarUtils';
import CalendarSortTableTools from '../../support/utils/uiCalendar_SortTableTools';

const isBetweenDatesByDay = CalendarSortTableTools.date.isBetweenDatesByDay;
const dateFromYYYYMMDD = CalendarSortTableTools.date.dateFromYYYYMMDD;

const addSort = CalendarSortTableTools.sortableMultiColumnList.addSort;
const sortRows = CalendarSortTableTools.sortCurrentCalendarAssignments.sortRows;

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

const getLocalizedDate = DateTools.uiCalendar.getLocalizedDate;

describe('Sort headings on "Current calendar assignments" tab', () => {
  let testCalendarResponse;
  before(() => {
    // login as admin so necessary state can be created
    cy.loginAsAdmin();

    // get admin token to use in okapiRequest to retrieve service points
    if (!Cypress.env('token')) {
      cy.getAdminToken();
    }

    // reset db state
    deleteServicePoint(testServicePoint.id, false);

    // create test service point
    createServicePoint(testServicePoint, (response) => {
      testCalendar.assignments = [response.body.id];

      createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });
      openCalendarSettings();
    });
  });

  after(() => {
    deleteServicePoint(testServicePoint.id, true);
    deleteCalendar(testCalendarResponse.id);
  });

  it(
    'C360960 Sort headings on "Current calendar assignments" tab (bama)',
    { tags: ['smoke', 'bama'] },
    () => {
      const calendars = [];
      const servicePoints = [];

      PaneActions.currentCalendarAssignmentsPane.openCurrentCalendarAssignmentsPane();

      // intercept API request
      cy.intercept(Cypress.env('OKAPI_HOST') + '/calendar/calendars?limit=2147483647', (req) => {
        if (req.method === 'GET') {
          req.continue((res) => {
            expect(res.statusCode).equals(200);
            calendars.push(...res.body.calendars);
          });
        }
      }).as('getCalendars');

      cy.wait('@getCalendars').then(() => {
        cy.okapiRequest({
          path: 'service-points',
          searchParams: {
            'cql.allRecords': '1',
            limit: '2147483647',
          },
          body: null,
          isDefaultSearchParamsRequired: false,
        }).then((res) => {
          servicePoints.push(...res.body.servicepoints);

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
                servicePoint: servicePoint.name.concat(servicePoint.inactive ? ' (inactive)' : ''),
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
      });
    },
  );
});
