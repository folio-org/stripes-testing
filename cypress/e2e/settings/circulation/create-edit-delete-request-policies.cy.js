import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import RequestPolicy from '../../../support/fragments/circulation/request-policy';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
// import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Permissions -> Circulation', () => {
  const userData = {};
  const newRequestPolicy = {
    name: uuid(),
    description: 'description',
    schedules: [
      {
        from: '2021/09/01',
        to: '2021/09/30',
        due: '2021/10/01',
      },
    ],
  };
  const editRequestPolicy = {
    name: uuid(),
    description: 'new description',
    schedules: [
      {
        from: '2023/03/23',
        to: '2023/04/24',
        due: '2023/05/25',
      },
    ],
  };

  before('Prepare test data', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.settingsCircCRUDRequestPolicies.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationRequestPoliciesPath,
            waiter: RequestPolicy.waitLoading,
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    RequestPolicy.deleteReuqestPolicyByNameViaAPI(newRequestPolicy.name);
    RequestPolicy.deleteReuqestPolicyByNameViaAPI(editRequestPolicy.name);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1213 Can create, edit and remove fixed due date schedules (vega)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      // // Create a new fixed due date schedule
      // FixedDueDateSchedules.clickButtonNew();
      // FixedDueDateSchedules.fillScheduleInfoAll(newFixedDueDateSchedules);
      // FixedDueDateSchedules.clickSaveAndClose();
      // InteractorsTools.checkCalloutMessage(
      //   `The fixed due date schedule ${newFixedDueDateSchedules.name} was successfully created.`,
      // );
      // FixedDueDateSchedules.checkGeneralInfo(newFixedDueDateSchedules);
      // FixedDueDateSchedules.checkSchedules(newFixedDueDateSchedules.schedules);
      // // Edit the fixed due date schedule
      // FixedDueDateSchedules.editScheduleAll(
      //   newFixedDueDateSchedules.name,
      //   editFixedDueDateSchedules,
      // );
      // InteractorsTools.checkCalloutMessage(
      //   `The fixed due date schedule ${editFixedDueDateSchedules.name} was successfully updated.`,
      // );
      // FixedDueDateSchedules.checkGeneralInfo(editFixedDueDateSchedules);
      // FixedDueDateSchedules.checkSchedules(editFixedDueDateSchedules.schedules);
      // // Remove the fixed due date schedule
      // FixedDueDateSchedules.clickActionsButton();
      // FixedDueDateSchedules.clickDeleteButton();
      // FixedDueDateSchedules.confirm();
      // InteractorsTools.checkCalloutMessage(
      //   `The fixed due date schedule ${editFixedDueDateSchedules.name} was successfully deleted.`,
      // );
      // FixedDueDateSchedules.checkGeneralInfoNotExist(editFixedDueDateSchedules);
      // FixedDueDateSchedules.checkSchedulesNotExist(editFixedDueDateSchedules.schedules);
    },
  );
});
