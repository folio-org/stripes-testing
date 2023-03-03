import { deleteServicePoint, createCalendar,
  openCalendarSettings, deleteCalendar, createServicePoint } from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import CalendarSortTableTools from '../../support/utils/uiCalendar_SortTableTools';
import { assertCalendarsIsProperlySorted } from '../../support/fragments/calendar/sort-table';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

const addSort = CalendarSortTableTools.sortableMultiColumnList.addSort;
const sortCalendars = CalendarSortTableTools.sortAllCalendars.sortCalendars;



describe('Sort headings on "All calendars" tab', () => {
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


  it('C360954 Sort headings on "All calendars" tab (bama)', { tags: [TestTypes.smoke, devTeams.bama] }, () => {
    const calendars = [];
    const servicePoints = [];

    PaneActions.allCalendarsPane.openAllCalendarsPane();

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
      }).then(res => {
        servicePoints.push(...res.body.servicepoints);

        // replace assignments' IDs with the service point names
        calendars.forEach((calendar) => {
          const servicePointNames = [];
          if (calendar.assignments.length > 0) {
            calendar.assignments.forEach(assignment => {
              const [servicePoint] = servicePoints.filter((sp) => sp.id === assignment);
              servicePointNames.push(servicePoint.name);
            });
            calendar.assignments = servicePointNames;
          }
        });


        // currentRows is the list of rows resulting from the sorting of baseRows using the primary and secondary sort
        let currentRows;

        // 'sorts' contains the primary and secondary sort
        // The SortableMultiColumnList component uses a primary sort and an optional secondary sort to sort its data
        // see 'addSort' for how this sorts array is updated
        let sorts = [];

        // sort in ascending order by calendar name
        PaneActions.calendarTable.clickCalendarNameHeader();

        sorts = addSort(sorts, 'calendarName');
        currentRows = sortCalendars(calendars, sorts);
        assertCalendarsIsProperlySorted(currentRows, 'calendarName');

        // sort in descending order by calendar name
        PaneActions.calendarTable.clickCalendarNameHeader();

        sorts = addSort(sorts, 'calendarName');
        currentRows = sortCalendars(calendars, sorts);
        assertCalendarsIsProperlySorted(currentRows, 'calendarName');




        // sort in ascending order by start date
        PaneActions.calendarTable.clickStartDateHeader();

        sorts = addSort(sorts, 'startDate');
        currentRows = sortCalendars(calendars, sorts);
        assertCalendarsIsProperlySorted(currentRows, 'startDate');

        // sort in descending order by start date
        PaneActions.calendarTable.clickStartDateHeader();

        sorts = addSort(sorts, 'startDate');
        currentRows = sortCalendars(calendars, sorts);
        assertCalendarsIsProperlySorted(currentRows, 'startDate');




        // sort in ascending order by end date
        PaneActions.calendarTable.clickEndDateHeader();

        sorts = addSort(sorts, 'endDate');
        currentRows = sortCalendars(calendars, sorts);
        assertCalendarsIsProperlySorted(currentRows, 'endDate');

        // sort in descending order by end date
        PaneActions.calendarTable.clickEndDateHeader();

        sorts = addSort(sorts, 'endDate');
        currentRows = sortCalendars(calendars, sorts);
        assertCalendarsIsProperlySorted(currentRows, 'endDate');




        // sort in ascending order by assignments
        PaneActions.calendarTable.clickAssignmentsHeader();

        sorts = addSort(sorts, 'assignments');
        currentRows = sortCalendars(calendars, sorts);
        assertCalendarsIsProperlySorted(currentRows, 'assignments');

        // sort in descending order by assignments
        PaneActions.calendarTable.clickAssignmentsHeader();

        sorts = addSort(sorts, 'assignments');
        currentRows = sortCalendars(calendars, sorts);
        assertCalendarsIsProperlySorted(currentRows, 'assignments');
      });
    });
  });
});
