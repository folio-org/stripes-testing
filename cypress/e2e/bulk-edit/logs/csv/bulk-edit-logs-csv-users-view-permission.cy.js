import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
const testData = {
  roleName: `Auto Role C380562 ${getRandomPostfix()}`,
  capabSetIds: [],
};
const capabSetsToAssign = [
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Logs',
    action: CAPABILITY_ACTIONS.VIEW,
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
const capabSetToUnselect = [
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users Roles',
    action: CAPABILITY_ACTIONS.VIEW,
  },
];
const newName = `testName_${getRandomPostfix()}`;
const userUUIDsFileName = `userUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const changedRecordsFileName = `*-Changed-Records*-${userUUIDsFileName}`;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('Csv approach', () => {
      before('create test data', () => {
        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;

            capabSetsToAssign.forEach((capabilitySet) => {
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
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, `${user.userId}`);
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
        Users.deleteViaApi(user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
        FileManager.deleteFileFromDownloadsByMask(
          `*${matchedRecordsFileName}`,
          changedRecordsFileName,
        );
      });

      it(
        'C380562 Verify generated Logs files for Users Local are hidden without "UI-Users" capability set (firebird)',
        { tags: ['criticalPath', 'firebird', 'C380562'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(user.username);

          BulkEditActions.downloadMatchedResults();
          BulkEditActions.prepareValidBulkEditFile(
            matchedRecordsFileName,
            editedFileName,
            user.firstName,
            newName,
          );

          BulkEditActions.openStartBulkEditLocalForm();
          BulkEditSearchPane.uploadFile(editedFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.clickNext();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.verifyChangedResults(newName);

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

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

          capabSetToUnselect.forEach((capabSet) => {
            AuthorizationRoles.selectCapabilitySetCheckbox(capabSet, false);
            cy.wait(1000);
          });

          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();

          capabSetToUnselect.forEach((capabSet) => {
            AuthorizationRoles.verifyCapabilityCheckboxAbsent(capabSet);
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.verifyActionsRunBy(
            `${user.lastName}, ${user.personal.preferredFirstName} ${user.personal.middleName}`,
          );
          BulkEditLogs.logActionsIsAbsent();
        },
      );
    });
  });
});
