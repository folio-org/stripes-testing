import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import DepartmentsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import PatronGroupsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/patronGroupsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Patron groups', () => {
        let userData;
        const sharedPatronGroups1 = {
          group: getTestEntityValue('SharedPatronGroups1'),
          desc: getTestEntityValue('SP1'),
          expirationOffsetInDays: '365',
        };
        const sharedPatronGroups2 = {
          group: getTestEntityValue('SharedPatronGroups2'),
          desc: getTestEntityValue('SP2'),
          expirationOffsetInDays: '365',
        };
        const rowDataToCheck = [...Object.values(sharedPatronGroups1), moment().format('l'), 'All'];

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.uiUsersViewPatronGroups.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.uiUsersViewPatronGroups.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.uiUsersViewPatronGroups.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(userData.username, userData.password);
            });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C407757 User with "Consortium manager: Can share settings to all members" permission is able to add/delete patron group shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C407757'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
            PatronGroupsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, sharedPatronGroups1);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(sharedPatronGroups1.group);
            ConfirmShare.clickConfirm();
            DepartmentsConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              `${sharedPatronGroups1.group} was successfully created for All libraries.`,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, sharedPatronGroups2);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(sharedPatronGroups2.group);
            ConfirmShare.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, sharedPatronGroups1);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              group: messages.notUnique('Group'),
            });

            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              sharedPatronGroups1.group,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('patron group', sharedPatronGroups1.group);

            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              sharedPatronGroups1.group,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('patron group', sharedPatronGroups1.group);
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted('patron group', sharedPatronGroups1.group),
            );
            DepartmentsConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              sharedPatronGroups1.group,
            );

            cy.visit(SettingsMenu.patronGroups);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              sharedPatronGroups1.group,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.patronGroups);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              sharedPatronGroups1.group,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.patronGroups);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              sharedPatronGroups1.group,
            );
          },
        );
      });
    });
  });
});
