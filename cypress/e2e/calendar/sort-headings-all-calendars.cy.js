import Calendar, {
  createCalendar,
  deleteCalendar,
  getTestCalendar,
  getTestServicePoint,
} from '../../support/fragments/calendar/calendar';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import { assertCalendarsIsProperlySorted } from '../../support/fragments/calendar/sort-table';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import CalendarSortTableTools from '../../support/utils/uiCalendar_SortTableTools';

const testServicePoint = getTestServicePoint();
const testCalendar = getTestCalendar({ assignments: [testServicePoint.id] });

const addSort = CalendarSortTableTools.sortableMultiColumnList.addSort;
const sortCalendars = CalendarSortTableTools.sortAllCalendars.sortCalendars;

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

      cy.loginAsAdmin({
        path: TopMenu.settingsCalendarPath,
        waiter: Calendar.waitCalendarPaneToLoad,
      });
    });

    after(() => {
      cy.getAdminToken();
      if (testCalendarResponse) {
        deleteCalendar(testCalendarResponse.id);
      }
      ServicePoints.deleteViaApi(testServicePoint.id);
    });

    it(
      'C360954 Sort headings on "All calendars" tab (helios)',
      { tags: ['smoke', 'helios', 'C360954'] },
      () => {
        const calendars = [];
        const servicePoints = [];

        // Build the expected rows from the same responses the UI renders, so calendars or service
        // points that other specs create or delete in the meantime can't make them differ
        cy.intercept('GET', '**/calendar/calendars?*').as('getCalendars');
        cy.intercept('GET', '**/service-points?*').as('getServicePoints');

        PaneActions.allCalendarsPane.openAllCalendarsPane();

        cy.wait(['@getCalendars', '@getServicePoints']).then(
          ([calendarsCall, servicePointsCall]) => {
            calendars.push(...calendarsCall.response.body.calendars);
            servicePoints.push(...servicePointsCall.response.body.servicepoints);

            // replace assignments' IDs with the service point names
            calendars.forEach((calendar) => {
              const servicePointNames = [];
              if (calendar.assignments.length > 0) {
                calendar.assignments.forEach((assignment) => {
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
          },
        );
      },
    );
  });
});
