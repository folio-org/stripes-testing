import uuid from 'uuid';
import Permissions from '../../../../support/dictionary/permissions';
import FixedDueDateSchedules from '../../../../support/fragments/circulation/fixedDueDateSchedules';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import DateTools from '../../../../support/utils/dateTools';

describe('Permissions -> Circulation', () => {
  const userData = {};
  const newFixedDueDateSchedules = {
    name: uuid(),
    description: 'description',
    schedules: [
      {
        from: DateTools.addDays(-1),
        to: DateTools.addDays(0),
        due: DateTools.addDays(+1),
      },
    ],
  };
  const editFixedDueDateSchedules = {
    name: uuid(),
    description: 'new description',
    schedules: [
      {
        from: DateTools.addDays(-2),
        to: DateTools.addDays(0),
        due: DateTools.addDays(+2),
      },
    ],
  };

  before('Prepare test data', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.uiCirculationViewCreateEditDeleteFixedDueDateSchedules.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationFixedDueDateSchedulesPath,
            waiter: FixedDueDateSchedules.waitLoading,
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    FixedDueDateSchedules.deleteFixedDueDateSchedulesByNameViaAPI(newFixedDueDateSchedules.name);
    FixedDueDateSchedules.deleteFixedDueDateSchedulesByNameViaAPI(editFixedDueDateSchedules.name);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1213 Can create, edit and remove fixed due date schedules (vega)',
    { tags: ['extendedPath', 'vega', 'C1213'] },
    () => {
      // Create a new fixed due date schedule
      FixedDueDateSchedules.clickButtonNew();
      FixedDueDateSchedules.fillScheduleInfo(newFixedDueDateSchedules);
      FixedDueDateSchedules.clickSaveAndClose();
      InteractorsTools.checkCalloutMessage(
        `The fixed due date schedule ${newFixedDueDateSchedules.name} was successfully created.`,
      );
      FixedDueDateSchedules.checkGeneralInfo(newFixedDueDateSchedules);
      FixedDueDateSchedules.checkSchedules(newFixedDueDateSchedules.schedules);

      // Edit the fixed due date schedule
      FixedDueDateSchedules.editSchedule(newFixedDueDateSchedules.name, editFixedDueDateSchedules);
      InteractorsTools.checkCalloutMessage(
        `The fixed due date schedule ${editFixedDueDateSchedules.name} was successfully updated.`,
      );
      FixedDueDateSchedules.checkGeneralInfo(editFixedDueDateSchedules);
      FixedDueDateSchedules.checkSchedules(editFixedDueDateSchedules.schedules);

      // Remove the fixed due date schedule
      FixedDueDateSchedules.clickActionsButton();
      FixedDueDateSchedules.clickDeleteButton();
      FixedDueDateSchedules.confirm();
      InteractorsTools.checkCalloutMessage(
        `The fixed due date schedule ${editFixedDueDateSchedules.name} was successfully deleted.`,
      );
      FixedDueDateSchedules.checkGeneralInfoNotExist(editFixedDueDateSchedules);
    },
  );
});
