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
import AlternativeTitleTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/alternativeTitleTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Alternative title types', () => {
        let userData;
        const alternativeTitleTypes1 = {
          name: getTestEntityValue('AlternativeTitleTypes1'),
        };

        const alternativeTitleTypes2 = {
          name: getTestEntityValue('alternativeTitleTypes2'),
        };
        const rowDataToCheck = [
          alternativeTitleTypes1.name,
          'consortium',
          moment().format('l'),
          'All',
        ];

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.crudAlternativeTitleTypes.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.crudAlternativeTitleTypes.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.crudAlternativeTitleTypes.gui,
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
          'C410875 User with "Consortium manager: Can share settings to all members" permission is able to add/delete alternative title type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            AlternativeTitleTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, alternativeTitleTypes1);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(alternativeTitleTypes1.name);
            ConfirmShare.clickConfirm();
            AlternativeTitleTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(alternativeTitleTypes1.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, alternativeTitleTypes2);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(alternativeTitleTypes2.name);
            ConfirmShare.clickKeepEditing();
            AlternativeTitleTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, alternativeTitleTypes1);
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
              alternativeTitleTypes1.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              'alternative title type',
              alternativeTitleTypes1.name,
            );

            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              alternativeTitleTypes1.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              'alternative title type',
              alternativeTitleTypes1.name,
            );
            DeleteCancelReason.clickDelete();
            AlternativeTitleTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted('alternative title type', alternativeTitleTypes1.name),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              alternativeTitleTypes1.name,
            );

            cy.wait(2000);
            cy.visit(SettingsMenu.alternativeTitleTypes);
            cy.wait(6000);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              alternativeTitleTypes1.name,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.alternativeTitleTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              alternativeTitleTypes1.name,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.alternativeTitleTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              alternativeTitleTypes1.name,
            );
          },
        );
      });
    });
  });
});
