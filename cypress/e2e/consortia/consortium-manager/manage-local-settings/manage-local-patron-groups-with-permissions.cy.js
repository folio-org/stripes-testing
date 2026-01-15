import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConfirmCreate from '../../../../support/fragments/consortium-manager/modal/confirm-create';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import PatronGroupsConsortiumManager from '../../../../support/fragments/consortium-manager/users/patronGroupsConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

const testData = {
  newPatronGroup: {
    group: getTestEntityValue('C410705_new'),
    desc: getTestEntityValue('C410705'),
    expirationOffsetInDays: '5',
  },
  editPatronGroup: {
    group: getTestEntityValue('C410705_edit'),
    desc: getTestEntityValue('C410705'),
    expirationOffsetInDays: '6',
  },
  tempPatronGroup: {
    group: getTestEntityValue('C410705'),
    desc: getTestEntityValue('C410705'),
    expirationOffsetInDays: '7',
  },
};

describe('Consortium manager', () => {
  describe('Manage local settings', () => {
    describe('Manage local Patron groups', () => {
      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.consortiaSettingsConsortiumManagerPatronGroupsAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.consortiaSettingsConsortiumManagerPatronGroupsAll.gui,
          ]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.consortiaSettingsConsortiumManagerPatronGroupsAll.gui,
          ]);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        PatronGroupsConsortiumManager.deletePatronGroupByNameAndTenant(
          testData.newPatronGroup.group,
          Affiliations.Consortia,
        );
        PatronGroupsConsortiumManager.deletePatronGroupByNameAndTenant(
          testData.editPatronGroup.group,
          Affiliations.University,
        );
        PatronGroupsConsortiumManager.deletePatronGroupByNameAndTenant(
          testData.newPatronGroup.group,
          Affiliations.College,
        );
        PatronGroupsConsortiumManager.deletePatronGroupByNameAndTenant(
          testData.newPatronGroup.group,
          Affiliations.University,
        );
      });

      it(
        'C410705 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local patron groups of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410705'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });

          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager();

          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          PatronGroupsConsortiumManager.choose();

          // ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newPatronGroup);
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmCreate.waitLoadingConfirmCreate(testData.newPatronGroup.group);
          ConfirmCreate.clickConfirm();

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newPatronGroup.group,
            tenantNames.central,
            [
              testData.newPatronGroup.group,
              testData.newPatronGroup.desc,
              testData.newPatronGroup.expirationOffsetInDays,
              '',
              tenantNames.central,
            ],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newPatronGroup.group,
            tenantNames.college,
            [
              testData.newPatronGroup.group,
              testData.newPatronGroup.desc,
              testData.newPatronGroup.expirationOffsetInDays,
              '',
              tenantNames.college,
            ],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newPatronGroup.group,
            tenantNames.university,
            [
              testData.newPatronGroup.group,
              testData.newPatronGroup.desc,
              testData.newPatronGroup.expirationOffsetInDays,
              '',
              tenantNames.university,
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newPatronGroup.group,
            tenantNames.university,
            actionIcons.edit,
          );

          ConsortiaControlledVocabularyPaneset.fillInTextField({
            group: testData.editPatronGroup.group,
          });
          ConsortiaControlledVocabularyPaneset.fillInTextField({
            desc: testData.editPatronGroup.desc,
          });
          ConsortiaControlledVocabularyPaneset.fillInTextField({
            expirationOffsetInDays: testData.editPatronGroup.expirationOffsetInDays,
          });
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiumManagerApp.checkMessage(
            `${testData.editPatronGroup.group} was successfully updated for ${tenantNames.university} library.`,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.editPatronGroup.group,
            tenantNames.university,
            [
              testData.editPatronGroup.group,
              testData.editPatronGroup.desc,
              testData.editPatronGroup.expirationOffsetInDays,
              '',
              tenantNames.university,
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newPatronGroup.group,
            tenantNames.college,
            actionIcons.trash,
          );
          ConsortiaControlledVocabularyPaneset.confirmDelete();
          ConsortiumManagerApp.checkMessage(
            messages.deleted('patron group', testData.newPatronGroup.group),
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.newPatronGroup.group,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.tempPatronGroup);
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConfirmCreate.waitLoadingConfirmCreate(testData.tempPatronGroup.group);
          ConfirmCreate.clickKeepEditing();
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.tempPatronGroup.group,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newPatronGroup);
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            group: messages.notUnique('Group'),
          });
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

          cy.visit(SettingsMenu.patronGroups);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.newPatronGroup.group,
              testData.newPatronGroup.desc,
              testData.newPatronGroup.expirationOffsetInDays,
              '',
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.patronGroups);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.newPatronGroup.group,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.patronGroups);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.editPatronGroup.group,
              testData.editPatronGroup.desc,
              testData.editPatronGroup.expirationOffsetInDays,
              '',
            ],
            [actionIcons.edit, actionIcons.trash],
          );
        },
      );
    });
  });
});
