import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import RequestCancellationReasonsConsortiumManager from '../../../../../support/fragments/consortium-manager/circulation/requestCancellationReasonsConsortiumManager';
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
import CancellationReason from '../../../../../support/fragments/settings/circulation/cancellationReason';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Request cancellation reasons', () => {
        let userData;
        const cancelReason = {
          name: getTestEntityValue('Shared_reason_1'),
          description: getTestEntityValue('SR1'),
          publicDescription: '',
        };

        const cancelReason2 = {
          name: getTestEntityValue('Shared_reason_2'),
          description: '',
          publicDescription: '',
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.settingsCircView.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.settingsCircView.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.settingsCircView.gui,
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
          'C410841 User with "Consortium manager: Can share settings to all members" permission is able to add/delete request cancellation reason shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C410841'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);
            RequestCancellationReasonsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, cancelReason);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(cancelReason.name);
            ConfirmShare.clickConfirm();
            RequestCancellationReasonsConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(cancelReason.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [...Object.values(cancelReason), 'All'],
              ['edit', 'trash'],
            );

            ConsortiaControlledVocabularyPaneset.createViaUi(true, cancelReason2);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(cancelReason2.name);
            ConfirmShare.clickKeepEditing();
            RequestCancellationReasonsConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, { name: cancelReason.name });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
            });

            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [...Object.values(cancelReason), 'All'],
              ['edit', 'trash'],
            );

            ConsortiaControlledVocabularyPaneset.performAction(
              cancelReason.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('cancel reason', cancelReason.name);

            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [...Object.values(cancelReason), 'All'],
              ['edit', 'trash'],
            );

            ConsortiaControlledVocabularyPaneset.performAction(
              cancelReason.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('cancel reason', cancelReason.name);
            DeleteCancelReason.clickDelete();
            RequestCancellationReasonsConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.deleted('cancel reason', cancelReason.name));
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(cancelReason.name);

            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            cy.wait(4000);
            CancellationReason.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(cancelReason.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            cy.wait(4000);
            CancellationReason.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(cancelReason.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            cy.wait(4000);
            CancellationReason.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(cancelReason.name);
          },
        );
      });
    });
  });
});
