import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../support/constants';

let user;
const testData = {
  roleName: `Auto Role C353978 ${getRandomPostfix()}`,
  capabSetIds: [],
};
const capabSetsToAssign = [
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Export-Manager Export-Manager',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Users Csv',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Users Csv',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Users Settings',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users Roles',
    action: CAPABILITY_ACTIONS.VIEW,
  },
];
const capabSetsToSelect = [
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Inventory',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Inventory',
    action: CAPABILITY_ACTIONS.EDIT,
  },
];
const capabSetsToUnselect = [
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Users Csv',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Users Csv',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    table: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  {
    table: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Users Settings',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  {
    table: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users Roles',
    action: CAPABILITY_ACTIONS.VIEW,
  },
];
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${userUUIDsFileName}`;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser([])
        .then((userProperties) => {
          user = userProperties;
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;

            capabSetsToAssign.forEach((capabilitySet) => {
              capabilitySet.table = capabilitySet.type;
              cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
                testData.capabSetIds.push(capabSetId);
              });
            });

            cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
            cy.addRolesToNewUserApi(user.userId, [testData.roleId]);
          });
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        })
        .then(() => {
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteAuthorizationRoleApi(testData.roleId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
    });

    it(
      'C788697 Verify that user can view data in Export Manager based on permissions (Negative) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C788697'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
        ExportManagerSearchPane.searchByBulkEdit();
        ExportManagerSearchPane.selectJob(user.username);
        ExportManagerSearchPane.clickJobIdInThirdPane();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Authorization roles');
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.openForEdit();
        AuthorizationRoles.clickSelectApplication();
        AuthorizationRoles.selectAllApplicationsInModal();
        AuthorizationRoles.clickSaveInModal();
        AuthorizationRoles.checkCapabilitySpinnersShown();
        AuthorizationRoles.checkCapabilitySpinnersAbsent();

        capabSetsToUnselect.forEach((capabilitySet) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(capabilitySet, false);
          cy.wait(2000);
        });
        capabSetsToSelect.forEach((capabilitySet) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(capabilitySet);
          cy.wait(2000);
        });

        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
        AuthorizationRoles.clickOnCapabilitySetsAccordion();

        capabSetsToSelect.forEach((capabilitySet) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
        });

        AuthorizationRoles.verifyCapabilitySetCheckboxChecked({
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Export-Manager Export-Manager',
          action: CAPABILITY_ACTIONS.MANAGE,
        });

        cy.login(user.username, user.password, {
          path: TopMenu.exportManagerPath,
          waiter: ExportManagerSearchPane.waitLoading,
        });
        ExportManagerSearchPane.searchByBulkEdit();
        ExportManagerSearchPane.selectJob(user.username);
        ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();
      },
    );
  });
});
