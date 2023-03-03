import { createCalendar,
  openCalendarSettings, deleteCalendar } from '../../support/fragments/calendar/calendar';

import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import CreateCalendarForm from '../../support/fragments/calendar/create-calendar-form';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const testCalendar = calendarFixtures.calendar;



describe('Duplicate an existing calendar to make a new one', () => {
  let testCalendarResponse;
  const duplicateCalendarName = 'test-calendar-a8531527-aa3b-447a-8c76-88f905ade409-duplicate';

  before(() => {
    // login
    openCalendarSettings(false);

    // get admin token to use in okapiRequest to retrieve service points
    if (!Cypress.env('token')) {
      cy.getAdminToken();
    }

    // create test calendar
    createCalendar(testCalendar, (calResponse) => {
      testCalendarResponse = calResponse.body;
    });

    openCalendarSettings();
  });


  it('C360953 Copy -> Duplicate an existing calendar to make a new one (bama)', { tags: [TestTypes.smoke, devTeams.bama] }, () => {
    PaneActions.allCalendarsPane.openAllCalendarsPane();
    PaneActions.allCalendarsPane.selectCalendar(testCalendarResponse.name);
    PaneActions.individualCalendarPane.selectDuplicateAction({ calendarName: testCalendarResponse.name });
    CreateCalendarForm.editNameAndSave({ newCalendarName: duplicateCalendarName });


    // intercept http request
    let duplicateCalendarID;
    cy.intercept(Cypress.env('OKAPI_HOST') + '/calendar/calendars', (req) => {
      if (req.method === 'POST') {
        req.continue((res) => {
          expect(res.statusCode).equals(201);
          duplicateCalendarID = res.body.id;
        });
      }
    }).as('createDuplicateCalendar');

    // check that duplicate calendar exists in list of calendars
    cy.wait('@createDuplicateCalendar').then(() => {
      deleteCalendar(testCalendarResponse.id);
      openCalendarSettings();
      PaneActions.allCalendarsPane.openAllCalendarsPane();
      PaneActions.allCalendarsPane.checkCalendarExists(duplicateCalendarName);

      // delete duplicate calendar
      deleteCalendar(duplicateCalendarID);
    });
  });
});
