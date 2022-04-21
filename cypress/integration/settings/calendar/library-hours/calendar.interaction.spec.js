import TestType from '../../../../support/dictionary/testTypes';
import calendarActions from '../../../../support/fragments/settings/calendar/library-hours/library-hours';

describe('Calendar', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C347825 Create, view, and edit calendar events', { tags: [TestType.smoke] }, () => {
    calendarActions.createCalendarEvent();
    calendarActions.editCalendarEvent();
    calendarActions.deleteCalendarEvent();
  });
});
