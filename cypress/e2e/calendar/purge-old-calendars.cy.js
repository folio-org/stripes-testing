import { deleteServicePoint, createServicePoint, createCalendar,
  openCalendarSettings } from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import ModalFragments from '../../support/fragments/calendar/modal-fragments';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;

// set calendar start and end date to at least 3 months ago
testCalendar.startDate = '2022-01-01';
testCalendar.endDate = '2022-01-31';
testCalendar.exceptions = [];



describe('Purge old calendars with a selectable date', () => {
  before(() => {
    // login
    cy.loginAsAdmin();

    // get admin token to use in okapiRequest to retrieve service points
    cy.getAdminToken();

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


  it('C360946 Delete -> Purge old calendars with a selectable date (bama)', { tags: [TestTypes.smoke, devTeams.bama] }, () => {
    PaneActions.allCalendarsPane.openAllCalendarsPane();
    PaneActions.allCalendarsPane.checkCalendarExists(testCalendar.name);
    PaneActions.allCalendarsPane.clickPurgeOldCalendarsAction();
    ModalFragments.checkPurgeOldCalendarsModalExists();

    ModalFragments.purgeOldCalendars.checkSelectFields();
    ModalFragments.purgeOldCalendars.clickCancelButton();
    ModalFragments.checkPurgeOldCalendarsModalAbsent();

    PaneActions.allCalendarsPane.clickPurgeOldCalendarsAction();
    ModalFragments.checkPurgeOldCalendarsModalWithDismiss();

    PaneActions.allCalendarsPane.clickPurgeOldCalendarsAction();
    ModalFragments.checkPurgeOldCalendarsModalExists();

    ModalFragments.purgeOldCalendars.purgeCalendarsMoreThanThreeMonthsOld({ calendarName: testCalendar.name });

    PaneActions.allCalendarsPane.checkCalendarAbsent(testCalendar.name);
  });
});
