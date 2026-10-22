import { Button, Link, Modal, MultiColumnListCell, Pane } from '../../../../interactors';
import { getTestEntityValue } from '../../utils/stringTools';
import ServicePoints from '../settings/tenant/servicePoints/servicePoints';
import calendarFixtures from './calendar-e2e-test-values';

// Calendar specs run in parallel, so each one creates its own service point and calendar
// instead of sharing the fixture IDs and names, which another spec could delete or replace
export const getTestServicePoint = () => ServicePoints.getDefaultServicePoint();

export const getTestCalendar = (overrides = {}) => ({
  ...Cypress._.cloneDeep(calendarFixtures.calendar),
  name: getTestEntityValue('Calendar'),
  ...overrides,
});

export const openCalendarSettings = (isLoggedIn = true) => {
  if (!isLoggedIn) {
    cy.loginAsAdmin();
  }
  cy.visit('settings/calendar');
};

export const deleteCalendarUI = (calendarName) => {
  openCalendarSettings();
  cy.do(Pane('Calendar').find(Link('All calendars')).click());

  cy.do(Pane('All calendars').find(MultiColumnListCell(calendarName)).exists());

  cy.do([
    Pane('All calendars').find(MultiColumnListCell(calendarName)).click(),
    Pane(calendarName).clickAction('Delete'),
    Modal('Confirm deletion').find(Button('Delete')).click(),
    Pane('All calendars').find(MultiColumnListCell(calendarName)).absent(),
  ]);
};

export const createCalendar = (testCalendarRequestBody, callback = null) => {
  function makeRequest() {
    cy.createCalendar(testCalendarRequestBody).then((response) => {
      if (response.status === 409) {
        deleteCalendarUI(testCalendarRequestBody.name);
        createCalendar(testCalendarRequestBody, callback);
      } else {
        expect(response.status).equals(201);
        if (callback != null) {
          callback(response);
        }
      }
    });
  }

  if (!Cypress.env('token')) {
    cy.getAdminToken().then(() => {
      makeRequest();
    });
  } else {
    makeRequest();
  }
};
export const deleteCalendar = (calendarID, callback = null) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: 'calendar/calendars/' + calendarID,
  }).then((response) => {
    expect(response.status).equals(204);
    if (callback) {
      callback(response);
    }
  });
};

// For cleanup of a calendar the test may already have deleted (or purged): deletes it only if it
// is still there, so the cleanup doesn't log a 404
export const deleteCalendarIfExists = (calendarID) => {
  cy.getCalendars().then(({ calendars }) => {
    if (calendars.some(({ id }) => id === calendarID)) {
      deleteCalendar(calendarID);
    }
  });
};

export const createServicePoint = (testServicePointRequestBody, callback) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'service-points',
    body: testServicePointRequestBody,
  }).then((response) => {
    expect(response.status).equals(201);
    if (callback) {
      callback(response);
    }
  });
};

export const deleteServicePoint = async (
  servicePointID,
  checkStatusCode = true,
  callback = null,
) => {
  function makeRequest() {
    cy.request({
      url: Cypress.env('OKAPI_HOST') + '/service-points/' + servicePointID,
      method: 'DELETE',
      headers: {
        'x-okapi-token': Cypress.env('token'),
        'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
      },
      failOnStatusCode: false,
    }).then((response) => {
      if (checkStatusCode) {
        expect(response.status).equals(204);
      } else {
        expect(response.status).oneOf([204, 404]);
      }
      if (callback) {
        callback(response);
      }
    });
  }

  if (!Cypress.env('token')) {
    cy.getAdminToken().then(() => {
      makeRequest();
    });
  } else {
    makeRequest();
  }
};

export default {
  waitCalendarPaneToLoad: () => {
    cy.expect(Pane('Calendar').exists());
  },
};
