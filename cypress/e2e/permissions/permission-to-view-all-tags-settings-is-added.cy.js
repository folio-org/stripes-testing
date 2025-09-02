import permissions from '../../support/dictionary/permissions';
import TagsGeneral from '../../support/fragments/settings/tags/tags-general';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import topMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../support/constants';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('Permissions', () => {
  describe('Permissions', () => {
    describe('Tags', () => {
      let userData;
      let servicePointId;
      const patronGroup = {
        name: getTestEntityValue('groupTags'),
      };

      before('Preconditions', () => {
        cy.getAdminToken().then(() => {
          ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then(
            (servicePoints) => {
              servicePointId = servicePoints[0].id;
            },
          );
          PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
            patronGroup.id = patronGroupResponse;
          });
          cy.createTempUser(
            [
              permissions.uiUserCanEnableDisableTags.gui,
              permissions.uiUserEdit.gui,
              permissions.uiUsersView.gui,
              permissions.uiUserCanAssignUnassignPermissions.gui,
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
        // Enable tags settings again to not break other tests in other threads
        topMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        TagsGeneral.changeEnableTagsStatus('enable');

        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        PatronGroups.deleteViaApi(patronGroup.id);
      });

      it(
        'C396357 Verify that new permission to view all the Tags settings is added (volaris)',
        { tags: ['criticalPath', 'volaris', 'C396357', 'eurekaPhase1'] },
        () => {
          TagsGeneral.changeEnableTagsStatus('enable');
          topMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.waitLoading();
          UsersSearchPane.searchByUsername(userData.username);
          UsersSearchPane.waitLoading();
          UsersCard.verifyTagsIconIsPresent();
          UsersCard.openTagsPane();
          topMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          TagsGeneral.changeEnableTagsStatus('disable');
          topMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersCard.verifyTagsIconIsAbsent();
        },
      );
    });
  });
});
