import uuid from 'uuid';

import Calendar, {
  createCalendar,
  deleteCalendar,
} from '../../support/fragments/calendar/calendar';
import calendarFixtures from '../../support/fragments/calendar/calendar-e2e-test-values';
import PaneActions from '../../support/fragments/calendar/pane-actions';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const DCB_CALENDAR_NAME = 'DCB Calendar';

describe('Calendar', () => {
  describe('Calendar New', () => {
    describe('DCB calendar', () => {
      const postfix = getRandomPostfix();
      const dcbCalendar = {
        ...calendarFixtures.calendar,
        id: uuid(),
        name: DCB_CALENDAR_NAME,
        assignments: [],
      };
      const testCalendar = {
        ...calendarFixtures.calendar,
        id: uuid(),
        name: `AT calendar ${postfix}`,
        assignments: [],
      };

      let createdCalendar;
      let createdDcbCalendar;
      let user;

      before(() => {
        cy.getAdminToken();

        cy.getCalendars()
          .then((body) => {
            const existingDcbCalendar = body.calendars.find(
              ({ name }) => name === DCB_CALENDAR_NAME,
            );

            if (existingDcbCalendar) {
              return existingDcbCalendar;
            }

            return cy.then(() => {
              createCalendar(dcbCalendar, (calendarResponse) => {
                createdDcbCalendar = calendarResponse.body;
              });
            });
          })
          .then(() => {
            createCalendar(testCalendar, (calendarResponse) => {
              createdCalendar = calendarResponse.body;
            });
          });

        cy.createTempUser([
          permissions.calendarEditCalendars.gui,
          permissions.calendarDelete.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.settingsCalendarPath,
            waiter: Calendar.waitCalendarPaneToLoad,
          });
        });
      });

      after(() => {
        cy.getAdminToken();

        Users.deleteViaApi(user.userId);

        if (createdCalendar?.id) {
          deleteCalendar(createdCalendar.id);
        }

        if (createdDcbCalendar?.id) {
          deleteCalendar(createdDcbCalendar.id);
        }
      });

      it(
        'C569610 Users do not see actions on DCB Calendar (volaris)',
        { tags: ['extendedPath', 'volaris', 'C569610'] },
        () => {
          PaneActions.allCalendarsPane.openAllCalendarsPane();
          PaneActions.allCalendarsPane.checkCalendarExists(DCB_CALENDAR_NAME);
          PaneActions.allCalendarsPane.checkCalendarExists(testCalendar.name);

          PaneActions.allCalendarsPane.selectCalendar(DCB_CALENDAR_NAME);
          PaneActions.checkPaneExists(DCB_CALENDAR_NAME);
          PaneActions.individualCalendarPane.checkActionMenuAbsent(DCB_CALENDAR_NAME);

          PaneActions.allCalendarsPane.selectCalendar(testCalendar.name);
          PaneActions.checkPaneExists(testCalendar.name);
          PaneActions.individualCalendarPane.checkActionMenuPresent(testCalendar.name);
          PaneActions.individualCalendarPane.openActionMenu(testCalendar.name);
          PaneActions.editButtonExists();
          PaneActions.deleteButtonExists();
        },
      );
    });
  });
});
