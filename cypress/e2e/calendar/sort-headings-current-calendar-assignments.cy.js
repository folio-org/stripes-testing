import {
  MultiColumnListHeader, Pane, Link
} from '../../../interactors';
import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';
import CalendarSortTableTools from '../../support/utils/uiCalendar_SortTableTools';
import getCurrentStatus from '../../support/utils/uiCalendar_CalendarUtils';
import { getLocalizedDate } from '../../support/utils/uiCalendar_DateUtils';
import { assertRowsAreProperlySorted } from '../../support/fragments/calendar/sort-table';

const isBetweenDatesByDay = CalendarSortTableTools.date.isBetweenDatesByDay;
const dateFromYYYYMMDD = CalendarSortTableTools.date.dateFromYYYYMMDD;

const addSort = CalendarSortTableTools.sortableMultiColumnList.addSort;
const sortRows = CalendarSortTableTools.sortCurrentCalendarAssignments.sortRows;

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;




describe('Sort headings on "Current calendar assignments" tab', () => {
  let testCalendarResponse;
  before(() => {
    // login as admin so necessary state can be created
    cy.loginAsAdmin();

    // get admin token to use in okapiRequest to retrieve service points
    cy.getAdminToken();

    // reset db state
    cy.deleteServicePoint(testServicePoint.id, false);

    // create test service point
    cy.createServicePoint(testServicePoint, (response) => {
      testCalendar.assignments = [response.body.id];

      cy.createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });
      cy.openCalendarSettings();
    });
  });

  after(() => {
    cy.deleteServicePoint(testServicePoint.id, true);
    cy.deleteCalendar(testCalendarResponse.id);
  });


  it('sorts headings on "Current calendar assignments" tab', () => {
    const calendars = [];
    const servicePoints = [];


    cy.do([
      Pane('Calendar').find(Link('Current calendar assignments')).click(),
    ]);

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
          'limit': '2147483647'
        },
        body: null,
        isDefaultSearchParamsRequired: false
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
                dateFromYYYYMMDD(calendar.endDate)
              ) && calendar.assignments.includes(servicePoint.id)
            );
          });
          if (filteredCalendars.length === 0) {
            return {
              servicePoint: servicePoint.name.concat(
                servicePoint.inactive ? ' (inactive)' : ''
              ),
              servicePointId: servicePoint.id,
              calendarName: 'None',
              startDate: '',
              startDateObj: undefined,
              endDate: '',
              endDateObj: undefined,
              currentStatus: 'Closed',
              calendar: null
            };
          }
          return {
            servicePointId: servicePoint.id,
            servicePoint: servicePoint.name.concat(
              servicePoint.inactive ? ' (inactive)' : ''
            ),
            calendarName: filteredCalendars[0].name,
            startDate: getLocalizedDate(filteredCalendars[0].startDate),
            startDateObj: dateFromYYYYMMDD(filteredCalendars[0].startDate),
            endDate: getLocalizedDate(filteredCalendars[0].endDate),
            endDateObj: dateFromYYYYMMDD(filteredCalendars[0].endDate),
            currentStatus: getCurrentStatus(new Date(Date.now()), filteredCalendars[0]),
            calendar: filteredCalendars[0]
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
        cy.do(
          MultiColumnListHeader('Service point').click(),
        );

        sorts = addSort(sorts, 'servicePoint');
        currentRows = sortRows(baseRows, sorts);
        assertRowsAreProperlySorted(currentRows, 'servicePoint');



        // sort in ascending order by calendar name
        cy.do(
          MultiColumnListHeader('Calendar name').click(),
        );

        sorts = addSort(sorts, 'calendarName');
        currentRows = sortRows(baseRows, sorts);
        assertRowsAreProperlySorted(currentRows, 'calendarName');

        // sort in descending order by calendar name
        cy.do(
          MultiColumnListHeader('Calendar name').click(),
        );

        sorts = addSort(sorts, 'calendarName');
        currentRows = sortRows(baseRows, sorts);
        assertRowsAreProperlySorted(currentRows, 'calendarName');




        // sort in ascending order by start date
        cy.do(
          MultiColumnListHeader('Start date').click(),
        );

        sorts = addSort(sorts, 'startDate');
        currentRows = sortRows(baseRows, sorts);
        assertRowsAreProperlySorted(currentRows, 'startDate');

        // sort in descending order by start date
        cy.do(
          MultiColumnListHeader('Start date').click(),
        );

        sorts = addSort(sorts, 'startDate');
        currentRows = sortRows(baseRows, sorts);
        assertRowsAreProperlySorted(currentRows, 'startDate');




        // sort in ascending order by end date
        cy.do(
          MultiColumnListHeader('End date').click(),
        );

        sorts = addSort(sorts, 'endDate');
        currentRows = sortRows(baseRows, sorts);
        assertRowsAreProperlySorted(currentRows, 'endDate');

        // sort in descending order by end date
        cy.do(
          MultiColumnListHeader('End date').click(),
        );

        sorts = addSort(sorts, 'endDate');
        currentRows = sortRows(baseRows, sorts);
        assertRowsAreProperlySorted(currentRows, 'endDate');




        // sort in ascending order by status
        cy.do(
          MultiColumnListHeader('Current status').click(),
        );

        sorts = addSort(sorts, 'currentStatus');
        currentRows = sortRows(baseRows, sorts);
        assertRowsAreProperlySorted(currentRows, 'currentStatus');

        // sort in descending order by status
        cy.do(
          MultiColumnListHeader('Current status').click(),
        );

        sorts = addSort(sorts, 'currentStatus');
        currentRows = sortRows(baseRows, sorts);
        assertRowsAreProperlySorted(currentRows, 'currentStatus');
      });
    });
  });
});
