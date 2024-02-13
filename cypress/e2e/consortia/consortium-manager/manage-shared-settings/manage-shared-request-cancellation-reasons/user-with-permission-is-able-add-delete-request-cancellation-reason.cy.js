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
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Request cancellation reasons', () => {
        let userData;
        const cancelReason = {
          name: getTestEntityValue('Shared_reason_1'),
          description: getTestEntityValue('SR1'),
          publicDescription: '',
          shared: true,
          members: 'All',
        };

        const cancelReason2 = {
          name: getTestEntityValue('Shared_reason_2'),
          description: '',
          publicDescription: '',
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
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp('Consortium manager');
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);

            RequestCancellationReasonsConsortiumManager.choose();
            RequestCancellationReasonsConsortiumManager.waitLoading();
            RequestCancellationReasonsConsortiumManager.verifyNewButtonDisabled(false);

            RequestCancellationReasonsConsortiumManager.createViaUi(cancelReason);
            RequestCancellationReasonsConsortiumManager.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(cancelReason.name);
            ConfirmShare.clickConfirm();
            RequestCancellationReasonsConsortiumManager.waitLoading();
            RequestCancellationReasonsConsortiumManager.checkMessage(
              messages.created(cancelReason),
            );
            RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
              ...cancelReason,
              actions: ['edit', 'trash'],
            });

            RequestCancellationReasonsConsortiumManager.createViaUi(cancelReason2);
            RequestCancellationReasonsConsortiumManager.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(cancelReason2.name);
            ConfirmShare.clickKeepEditing();
            RequestCancellationReasonsConsortiumManager.verifyEditModeElementsIsActive();
            RequestCancellationReasonsConsortiumManager.clickCancel();

            RequestCancellationReasonsConsortiumManager.createViaUi(cancelReason);
            RequestCancellationReasonsConsortiumManager.clickSave();
            RequestCancellationReasonsConsortiumManager.verifyCancelReasonNameFailure(
              messages.notUnique,
            );
            RequestCancellationReasonsConsortiumManager.clickCancel();

            RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
              ...cancelReason,
              actions: ['edit', 'trash'],
            });

            RequestCancellationReasonsConsortiumManager.performAction(
              cancelReason.name,
              reasonsActions.trash,
            );
            DeleteCancelReason.waitLoadingDeleteCancelReason(cancelReason.name);

            DeleteCancelReason.clickCancel();
            RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
              ...cancelReason,
              actions: ['edit', 'trash'],
            });

            RequestCancellationReasonsConsortiumManager.performAction(
              cancelReason.name,
              reasonsActions.trash,
            );
            DeleteCancelReason.waitLoadingDeleteCancelReason(cancelReason.name);
            DeleteCancelReason.clickDelete();
            RequestCancellationReasonsConsortiumManager.waitLoading();
            RequestCancellationReasonsConsortiumManager.checkMessage(
              messages.deleted(cancelReason),
            );
            RequestCancellationReasonsConsortiumManager.verifyNoReasonInTheList(cancelReason.name);

            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            CancellationReason.waitLoading();
            CancellationReason.verifyNoReasonInTheList(cancelReason.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            CancellationReason.waitLoading();
            CancellationReason.verifyNoReasonInTheList(cancelReason.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            CancellationReason.waitLoading();
            CancellationReason.verifyNoReasonInTheList(cancelReason.name);
          },
        );
      });
    });
  });
});
