import uuid from 'uuid';
import devTeams from '../../../../support/dictionary/devTeams';
import TestType from '../../../../support/dictionary/testTypes';
import calendarActions from '../../../../support/fragments/settings/calendar/library-hours/library-hours';
import permissions from '../../../../support/dictionary/permissions';
import users from '../../../../support/fragments/users/users';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('Calendar', () => {
  const limitedAccessUser = {};
  const fullAccessUser = {};
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation('autotest CRUD event', uuid());

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
    ServicePoints.createViaApi(servicePoint);
  });

  after(() => {
    users.deleteViaApi(fullAccessUser.id);
    users.deleteViaApi(limitedAccessUser.id);
    calendarActions.clearCreatedEvents(servicePoint.name);//.then(() => ServicePoints.deleteViaApi(servicePoint.id));
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it('C347825 Create, view, edit and delete calendar events (vega)', { tags: [TestType.smoke, devTeams.vega] }, () => {
    cy.login(fullAccessUser.userName, fullAccessUser.password);

    calendarActions.openCalendarEvents(servicePoint.name);
    calendarActions.createCalendarEvent();
    calendarActions.openEditCalendarPage();
    calendarActions.editCalendarEvent();
    calendarActions.deleteCalendarEvent();
  });

  it('C353206 Settings (Calendar): Can create, view, and edit calendar events (vega)', { tags: [TestType.smoke, devTeams.vega] }, () => {
    cy.login(limitedAccessUser.userName, limitedAccessUser.password);

    calendarActions.openCalendarEvents(servicePoint.name);
    calendarActions.createCalendarEvent();
    calendarActions.openEditCalendarPage();
    calendarActions.checkDeleteButtonAbsence();
    calendarActions.editCalendarEvent();
  });
});
