import moment from 'moment';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import ModesOfIssuanceConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/modesOfIssuanceConsortiumManager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Modes of issuance', () => {
        let userData;
        const modesIssuance1 = { name: getTestEntityValue('SharedModesIssuance1') };
        const modesIssuance2 = { name: getTestEntityValue('SharedModesIssuance2') };
        const rowDataToCheck = [modesIssuance1.name, 'consortium', moment().format('l'), 'All'];

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
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
          'C410953 User with "Consortium manager: Can share settings to all members" permission is able to add/delete mode of issuance shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp('Consortium manager');
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ModesOfIssuanceConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, modesIssuance1);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(modesIssuance1.name);
            ConfirmShare.clickConfirm();
            ModesOfIssuanceConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(modesIssuance1.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, modesIssuance2);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(modesIssuance2.name);
            ConfirmShare.clickKeepEditing();
            ModesOfIssuanceConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, modesIssuance1);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
            });

            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              modesIssuance1.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('mode of issuance', modesIssuance1.name);

            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              modesIssuance1.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('mode of issuance', modesIssuance1.name);
            DeleteCancelReason.clickDelete();
            ModesOfIssuanceConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted('mode of issuance', modesIssuance1.name),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(modesIssuance1.name);

            cy.visit(SettingsMenu.modesOfIssuancePath);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(modesIssuance1.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.modesOfIssuancePath);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(modesIssuance1.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.modesOfIssuancePath);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(modesIssuance1.name);
          },
        );
      });
    });
  });
});
