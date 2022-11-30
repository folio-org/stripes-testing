import localforage from 'localforage';
import { Link, MultiColumnListCell, Pane, Modal, Button } from '../../interactors';

Cypress.Commands.add('openCalendarSettings', (isLoggedIn = true) => {
  if (!isLoggedIn) {
    cy.loginAsAdmin();
  }
  cy.visit('settings/calendar');
});

Cypress.Commands.add('createCalendar', (testCalendarRequestBody, callback) => {
  cy.wrap(localforage.getItem('okapiSess')).then((okapiSess) => {
    expect(okapiSess).to.have.property('token');
    cy.request({
      url: Cypress.env('OKAPI_HOST') + '/calendar/calendars',
      method: 'POST',
      body: testCalendarRequestBody,
      headers: {
        'x-okapi-tenant': Cypress.env('okapi_tenant'),
        'x-okapi-token': okapiSess.token
      },
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 409) {
        cy.deleteCalendarUI(testCalendarRequestBody.name);
        cy.createCalendar(testCalendarRequestBody, callback);
      } else {
        expect(response.status).equals(201);
        callback(response);
      }
    });
  });
});

Cypress.Commands.add('deleteCalendar', (calendarID, callback = null) => {
  cy.wrap(localforage.getItem('okapiSess')).then(okapiSess => {
    expect(okapiSess).to.have.property('token');
    cy.request({
      url: Cypress.env('OKAPI_HOST') + '/calendar/calendars/' + calendarID,
      method: 'DELETE',
      headers: {
        'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
        'x-okapi-token': okapiSess.token
      }
    }).then((response) => {
      expect(response.status).equals(204);
      if (callback) { callback(response); }
    });
  });
});

Cypress.Commands.add('deleteCalendarUI', (calendarName) => {
  cy.openCalendarSettings();
  cy.do(
    Pane('Calendar').find(Link('All calendars')).click()
  );

  cy.do(
    Pane('All calendars').find(MultiColumnListCell(calendarName)).exists()
  );

  cy.do([
    Pane('All calendars').find(MultiColumnListCell(calendarName)).click(),
    Pane(calendarName).clickAction('Delete'),
    Modal('Confirm deletion').find(Button('Delete')).click(),
    Pane('All calendars').find(MultiColumnListCell(calendarName)).absent()
  ]);
});


Cypress.Commands.add('createServicePoint', (testServicePointRequestBody, callback) => {
  cy.wrap(localforage.getItem('okapiSess')).then((okapiSess) => {
    expect(okapiSess).to.have.property('token');
    cy.request({
      url: Cypress.env('OKAPI_HOST') + '/service-points',
      method: 'POST',
      body: testServicePointRequestBody,
      headers: {
        'x-okapi-tenant': Cypress.env('okapi_tenant'),
        'x-okapi-token': okapiSess.token
      }
    }).then((response) => {
      expect(response.status).equals(201);
      callback(response);
    });
  });
});

Cypress.Commands.add('deleteServicePoint', (servicePointID, checkStatusCode = true, callback = null) => {
  cy.wrap(localforage.getItem('okapiSess')).then(okapiSess => {
    expect(okapiSess).to.have.property('token');
    cy.request({
      url: Cypress.env('OKAPI_HOST') + '/service-points/' + servicePointID,
      method: 'DELETE',
      headers: {
        'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
        'x-okapi-token': okapiSess.token
      },
      failOnStatusCode: false,
    }).then((response) => {
      if (checkStatusCode) {
        expect(response.status).equals(204);
      } else {
        expect(response.status).oneOf([204, 404]);
      }
      if (callback) { callback(response); }
    });
  });
});

