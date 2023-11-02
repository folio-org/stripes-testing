import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import { getTestEntityValue } from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import TagsGeneral from '../../support/fragments/settings/tags/tags-general';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('Permissions Tags', () => {
  let userData;
  let servicePointId;
  const patronGroup = {
    name: getTestEntityValue('groupTags'),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser(
        [
          permissions.uiUserCanEnableDisableTags.gui,
          permissions.uiUserEdit.gui,
          permissions.uiUsersView.gui,
          permissions.uiUsersPermissions.gui,
          permissions.uiViewTagsSettings.gui,
        ],
        patronGroup.name,
      ).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
        cy.login(userData.username, userData.password, {
          path: SettingsMenu.tagsGeneralPath,
          waiter: TagsGeneral.waitLoading,
        });
      });
    });
  });

  after('Deleting created entities', () => {
    cy.loginAsAdmin({
      path: SettingsMenu.tagsGeneralPath,
      waiter: TagsGeneral.waitLoading,
    });
    TagsGeneral.changeEnableTagsStatus('enable');
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C396357 Verify that new permission to view all the Tags settings is added (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      TagsGeneral.changeEnableTagsStatus('disable');
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(userData.username);
      UsersSearchPane.waitLoading();
      UserEdit.addPermissions([permissions.uiUserCanEnableDisableTags.gui]);
      UserEdit.saveAndClose();
      cy.login(userData.username, userData.password, {
        path: SettingsMenu.tagsGeneralPath,
        waiter: TagsGeneral.waitLoading,
      });
      TagsGeneral.checkEnableTagsNotAvailable();
    },
  );
});
