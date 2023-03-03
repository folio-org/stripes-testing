import { deleteServicePoint, createServicePoint, createCalendar,
  openCalendarSettings } from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import ModalFragments from '../../support/fragments/calendar/modal-fragments';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;


describe('Delete existing calendars', () => {
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

      createCalendar(testCalendar);
      openCalendarSettings();
    });
  });

  after(() => {
    deleteServicePoint(testServicePoint.id, true);
  });


  it('C360943 Delete -> Delete existing calendar (bama)', { tags: [TestTypes.smoke, devTeams.bama] }, () => {
    PaneActions.allCalendarsPane.openAllCalendarsPane();
    PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
    PaneActions.individualCalendarPane.selectDeleteAction({
      calendarName: testCalendar.name
    });
    ModalFragments.checkCalendarDeletionModalWithCancelButton();

    PaneActions.individualCalendarPane.checkIndividualCalendarPaneExists(testCalendar.name);
    PaneActions.individualCalendarPane.selectDeleteAction({
      calendarName: testCalendar.name
    });
    ModalFragments.checkCalendarDeletionModalWithDismiss();

    PaneActions.individualCalendarPane.selectDeleteAction({
      calendarName: testCalendar.name
    });
    ModalFragments.checkCalendarDeletionModalExists();
    ModalFragments.clickDeleteButtonOnCalendarDeletionModal();
    PaneActions.allCalendarsPane.checkCalendarAbsent(testCalendar.name);
  });
});
