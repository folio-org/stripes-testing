import TestType from '../../../../support/dictionary/testTypes';
import calendarActions from '../../../../support/fragments/settings/calendar/library-hours/library-hours';
import permissions from '../../../../support/dictionary/permissions';

describe('Calendar', () => {
  const limitedAccessUser = {
    id: '',
    userName: '',
    password: '',
  };
  const fullAccessUser = { ...limitedAccessUser };

  before(() => {
    cy.createTempUser([permissions.calendarAll.gui])
      .then(userProperties => {
        fullAccessUser.id = userProperties.userId;
        fullAccessUser.userName = userProperties.username;
        fullAccessUser.password = userProperties.password;
      });
    cy.createTempUser([permissions.calendarEdit.gui])
      .then(userProperties => {
        limitedAccessUser.id = userProperties.userId;
        limitedAccessUser.userName = userProperties.username;
        limitedAccessUser.password = userProperties.password;
      });
  });

  after(() => {
    cy.deleteUser(fullAccessUser.id);
    cy.deleteUser(limitedAccessUser.id);
    calendarActions.clearCreatedEvents();
  });

  it('C347825 Create, view, edit and delete calendar events', { tags: [TestType.smoke] }, () => {
    cy.login(fullAccessUser.userName, fullAccessUser.password);

    calendarActions.openCalendarEvents();
    calendarActions.createCalendarEvent();
    calendarActions.openEditCalendarPage();
    calendarActions.editCalendarEvent();
    calendarActions.deleteCalendarEvent();
  });

  it('C353206 Settings (Calendar): Can create, view, and edit calendar events', { tags: [TestType.smoke] }, () => {
    cy.login(limitedAccessUser.userName, limitedAccessUser.password);

    calendarActions.openCalendarEvents();
    calendarActions.createCalendarEvent();
    calendarActions.openEditCalendarPage();
    calendarActions.checkDeleteButtonAbsence();
    calendarActions.editCalendarEvent();
  });
});
