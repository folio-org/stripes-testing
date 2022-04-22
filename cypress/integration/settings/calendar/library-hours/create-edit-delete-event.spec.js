import TestType from '../../../../support/dictionary/testTypes';
import calendarActions from '../../../../support/fragments/settings/calendar/library-hours/library-hours';
import permissions from '../../../../support/dictionary/permissions';

describe('Calendar', () => {
  let userId = '';

  before(() => {
    cy.createTempUser([permissions.calendarAll.gui])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
      });
  });

  after(() => {
    cy.deleteUser(userId);
  });

  it('C347825 Create, view, and edit calendar events', { tags: [TestType.smoke] }, () => {
    calendarActions.createCalendarEvent();
    calendarActions.editCalendarEvent();
    calendarActions.deleteCalendarEvent();
  });
});
