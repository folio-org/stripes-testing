import TestType from '../../../../support/dictionary/testTypes';
import calendarActions from '../../../../support/fragments/settings/calendar/library-hours/library-hours';
import permissions from '../../../../support/dictionary/permissions';

describe('Calendar', () => {
  let fullAccessUserId;
  const limitedAccessUser = {
    id: '',
    userName: '',
    password: '',
  };

  before(() => {
    cy.createTempUser([permissions.calendarAll.gui])
      .then(userProperties => {
        fullAccessUserId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
      });
    cy.createTempUser([permissions.calendarEdit.gui])
      .then(userProperties => {
        limitedAccessUser.id = userProperties.userId;
        limitedAccessUser.userName = userProperties.username;
        limitedAccessUser.password = userProperties.password;
      });
  });

  after(() => {
    cy.deleteUser(fullAccessUserId);
    cy.deleteUser(limitedAccessUser.id);
    calendarActions.clearCreatedEvents();
  });

  it('C347825 Create, view, edit and delete calendar events', { tags: [TestType.smoke] }, () => {
    calendarActions.openCalendarEvents();
    calendarActions.createCalendarEvent();
    calendarActions.openEditCalendarPage();
    calendarActions.editCalendarEvent();
    calendarActions.deleteCalendarEvent();
  });

  it('C353206 Create, view, and edit calendar events', { tags: [TestType.smoke] }, () => {
    cy.login(limitedAccessUser.userName, limitedAccessUser.password);

    calendarActions.openCalendarEvents();
    calendarActions.createCalendarEvent();
    calendarActions.openEditCalendarPage();
    calendarActions.checkDeleteButtonAbsence();
    calendarActions.editCalendarEvent();
  });
});
