import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import RequestCancellationReasonsConsortiumManager, {
  messages,
  reasonsActions,
} from '../../../../../support/fragments/consortium-manager/circulation/requestCancellationReasonsConsortiumManager';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import CancellationReason from '../../../../../support/fragments/settings/circulation/cancellationReason';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Request cancellation reasons', () => {
        let userData;
        const cancelReason = {
          name: getTestEntityValue('Shared_reason_3'),
          description: '',
          publicDescription: getTestEntityValue('SR3'),
          shared: true,
          members: 'All',
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
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
          cy.getCancellationReasonsApi({ name: cancelReason.name }).then((cancellationReasons) => {
            cy.deleteCancellationReasonApi(cancellationReasons[0].id);
          });
        });

        it(
          'C410842 User with "Consortium manager: Can share settings to all members" permission is able to add/edit request cancellation reason shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp('Consortium manager');
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
            ConsortiumManagerApp.chooseSecondMenuItem('Request cancellation reasons');

            RequestCancellationReasonsConsortiumManager.createViaUi(cancelReason);
            RequestCancellationReasonsConsortiumManager.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(cancelReason.name);
            ConfirmShare.clickConfirm();
            RequestCancellationReasonsConsortiumManager.checkMessage(
              messages.created(cancelReason),
            );
            RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
              ...cancelReason,
              actions: ['edit', 'trash'],
            });

            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            CancellationReason.waitLoading();
            CancellationReason.verifyReasonInTheList(cancelReason);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            CancellationReason.waitLoading();
            CancellationReason.verifyReasonInTheList(cancelReason);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp('Consortium manager');
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);
            RequestCancellationReasonsConsortiumManager.choose();
            RequestCancellationReasonsConsortiumManager.performAction(
              cancelReason.name,
              reasonsActions.edit,
            );

            cancelReason.name = getTestEntityValue('Shared_reason_3_edited');
            RequestCancellationReasonsConsortiumManager.fillInCancelReasonName(cancelReason.name);
            cancelReason.publicDescription = getTestEntityValue('SR3E');
            RequestCancellationReasonsConsortiumManager.fillInPublicDescription(
              cancelReason.publicDescription,
            );
            RequestCancellationReasonsConsortiumManager.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(cancelReason.name);
            ConfirmShare.clickConfirm();
            RequestCancellationReasonsConsortiumManager.checkMessage(
              messages.updated(cancelReason),
            );

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1);

            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(0);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

            SelectMembers.saveAndClose();
            RequestCancellationReasonsConsortiumManager.verifyListIsEmpty();
            RequestCancellationReasonsConsortiumManager.verifyNewButtonDisabled();

            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            CancellationReason.waitLoading();
            CancellationReason.verifyReasonInTheList(cancelReason);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            CancellationReason.waitLoading();
            CancellationReason.verifyReasonInTheList(cancelReason);
          },
        );
      });
    });
  });
});
