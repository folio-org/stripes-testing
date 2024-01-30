import {
  createServicePoint,
  deleteCalendar,
  deleteServicePoint,
  openCalendarSettings,
} from '../../support/fragments/calendar/calendar';

import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import PaneActions from '../../support/fragments/calendar/pane-actions';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;
const newCalendarInfo = calendarFixtures.data.newCalendar;

let calendarID;

describe('Calendar', () => {
  describe('Calendar New', () => {
    before(() => {
      // login
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
      });

      // cy.deleteCalendarUI();
      openCalendarSettings();
    });

    after(() => {
      deleteServicePoint(testServicePoint.id, true);
      if (calendarID) {
        deleteCalendar(calendarID);
      }
    });

    it(
      'C360955 Create -> Create calendars that are 24/7 (never close) (bama)',
      { tags: ['smokeBama', 'bama'] },
      () => {
        PaneActions.allCalendarsPane.clickNewButton();

        CreateCalendarForm.create247Calendar(newCalendarInfo, testServicePoint.name);

        // intercept http request
        cy.intercept(Cypress.env('OKAPI_HOST') + '/calendar/calendars', (req) => {
          if (req.method === 'POST') {
            req.continue((res) => {
              expect(res.statusCode).equals(201);
              calendarID = res.body.id;
            });
          }
        }).as('createCalendar');

        cy.wait('@createCalendar').then(() => {
          openCalendarSettings();
          PaneActions.individualCalendarPane.checkIfOpen247(newCalendarInfo.name);
        });
      },
    );
  });
});
