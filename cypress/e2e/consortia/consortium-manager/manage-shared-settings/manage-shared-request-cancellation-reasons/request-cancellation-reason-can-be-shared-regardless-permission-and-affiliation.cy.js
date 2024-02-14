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
} from '../../../../../support/fragments/consortium-manager/circulation/requestCancellationReasonsConsortiumManager';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import CancellationReason from '../../../../../support/fragments/settings/circulation/cancellationReason';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import { calloutTypes } from '../../../../../../interactors';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Request cancellation reasons', () => {
        let userAData;
        let userBData;
        const firstCancelReason = {
          name: '',
          description: 'decsInt',
          publicDescription: '',
          shared: true,
          members: 'All',
        };
        const secondCancelReason2 = {
          name: getTestEntityValue('rcr2'),
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
                userAData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userAData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userAData.userId, [
                  Permissions.uiOrganizationsView.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              cy.createTempUser([Permissions.settingsCircView.gui]).then((userProperties) => {
                userBData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userBData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userBData.userId, [
                  Permissions.settingsCircView.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userBData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userBData.userId, [
                  Permissions.settingsCircView.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(userAData.username, userAData.password);
            });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userAData.userId);
          Users.deleteViaApi(userBData.userId);
          cy.getCancellationReasonsApi({ name: firstCancelReason.name }).then(
            (cancellationReasons) => {
              cy.deleteCancellationReasonApi(cancellationReasons[0].id);
            },
          );
          cy.getCancellationReasonsApi({ name: secondCancelReason2.name }).then(
            (cancellationReasons) => {
              cy.deleteCancellationReasonApi(cancellationReasons[0].id);
            },
          );
        });

        it(
          'C410843 Request cancellation reason can be shared to all tenants in "Consortium manager" app regardless permission and affiliation (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp('Consortium manager');
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);
            RequestCancellationReasonsConsortiumManager.choose();
            RequestCancellationReasonsConsortiumManager.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );

            RequestCancellationReasonsConsortiumManager.createViaUi(firstCancelReason);
            RequestCancellationReasonsConsortiumManager.clickSave();
            RequestCancellationReasonsConsortiumManager.verifyCancelReasonNameFailure(
              messages.pleaseFillIn,
            );

            firstCancelReason.name = getTestEntityValue('rcr1');
            RequestCancellationReasonsConsortiumManager.fillInCancelReasonName(
              firstCancelReason.name,
            );
            RequestCancellationReasonsConsortiumManager.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(firstCancelReason.name);
            ConfirmShare.clickConfirm();
            RequestCancellationReasonsConsortiumManager.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );
            RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
              ...firstCancelReason,
              actions: ['edit', 'trash'],
            });

            RequestCancellationReasonsConsortiumManager.createViaUi(secondCancelReason2);
            RequestCancellationReasonsConsortiumManager.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(secondCancelReason2.name);
            ConfirmShare.clickKeepEditing();
            RequestCancellationReasonsConsortiumManager.verifyEditModeElementsIsActive();
            RequestCancellationReasonsConsortiumManager.clickCancel();

            cy.logout();
            cy.login(userBData.username, userBData.password);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            CancellationReason.waitLoading();
            CancellationReason.verifyReasonInTheList(firstCancelReason);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            CancellationReason.waitLoading();
            CancellationReason.verifyReasonInTheList(firstCancelReason);
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            CancellationReason.waitLoading();
            CancellationReason.verifyReasonInTheList(firstCancelReason);
          },
        );
      });
    });
  });
});
