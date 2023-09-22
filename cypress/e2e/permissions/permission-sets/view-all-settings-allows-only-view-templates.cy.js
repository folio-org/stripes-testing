import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import PermissionSets from '../../../support/fragments/settings/users/permissionSets';
import PatronBlockTemplates from '../../../support/fragments/settings/users/patronBlockTemplates';

describe('Permission Sets', () => {
  let userData;
  const patronGroup = {
    name: getTestEntityValue('GroupPermissionSets'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const patronBlockTemplate = {
    name: getTestEntityValue('Template'),
    desc: getTestEntityValue('Description'),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.userServicePoint);
      PatronBlockTemplates.createViaApi(patronBlockTemplate).then((templateResp) => {
        testData.patronBlockTemplateId = templateResp.id;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser([permissions.uiUsersViewAllSettings.gui], patronGroup.name).then(
        (userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id,
          );
          cy.login(userData.username, userData.password);
        },
      );
    });
  });

  after('Deleting created entities', () => {
    PatronBlockTemplates.deleteViaApi(testData.patronBlockTemplateId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C402779 Verify that "Settings(users):View all settings " allows to only view Templates (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.patronBlockTemplates);
      PatronBlockTemplates.findPatronTemlate(patronBlockTemplate.name);
      PermissionSets.checkEditButtonNotAvailable();
    },
  );
});
