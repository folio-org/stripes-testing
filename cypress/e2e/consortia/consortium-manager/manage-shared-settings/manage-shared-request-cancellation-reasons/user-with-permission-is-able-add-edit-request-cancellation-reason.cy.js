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
          name: getTestEntityValue('Shared_reason_3'),
          description: '',
          publicDescription: getTestEntityValue('SR3'),
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
          cy.getCancellationReasonsApi({
            limit: 1,
            query: `name=="${cancelReason.name}"`,
          }).then((cancellationReasons) => {
            RequestCancellationReasonsConsortiumManager.deleteViaApi({
              payload: {
                name: cancelReason.name,
                id: cancellationReasons[0].id,
                source: 'consortium',
              },
              settingId: cancellationReasons[0].id,
              url: '/cancellation-reason-storage/cancellation-reasons',
            });
          });
        });

        it(
          'C410842 User with "Consortium manager: Can share settings to all members" permission is able to add/edit request cancellation reason shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C410842'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(1);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, true);

            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);
            RequestCancellationReasonsConsortiumManager.choose();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, cancelReason);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(cancelReason.name);
            ConfirmShare.clickConfirm();
            ConsortiumManagerApp.checkMessage(messages.created(cancelReason.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [...Object.values(cancelReason), 'All'],
              ['edit', 'trash'],
            );

            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            cy.wait(4000);
            CancellationReason.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(Object.values(cancelReason));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            cy.wait(4000);
            CancellationReason.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(Object.values(cancelReason));

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);
            RequestCancellationReasonsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(cancelReason.name, actionIcons.edit);

            cancelReason.name = getTestEntityValue('Shared_reason_3_edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: cancelReason.name });
            cancelReason.publicDescription = getTestEntityValue('SR3E');
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              publicDescription: cancelReason.publicDescription,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(cancelReason.name);
            ConfirmShare.clickConfirm();
            RequestCancellationReasonsConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.updated(cancelReason.name, 'All'));

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1);

            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(0);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyListIsEmpty();
            // ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();

            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            cy.wait(4000);
            CancellationReason.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(Object.values(cancelReason));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            cy.wait(4000);
            CancellationReason.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(Object.values(cancelReason));
          },
        );
      });
    });
  });
});
