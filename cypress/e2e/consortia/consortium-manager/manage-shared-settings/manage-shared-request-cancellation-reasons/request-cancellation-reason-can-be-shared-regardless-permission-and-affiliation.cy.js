import { calloutTypes } from '../../../../../../interactors';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import RequestCancellationReasonsConsortiumManager from '../../../../../support/fragments/consortium-manager/circulation/requestCancellationReasonsConsortiumManager';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
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
        let userAData;
        let userBData;
        const firstCancelReason = {
          name: '',
          description: 'decsInt',
          publicDescription: '',
        };
        const secondCancelReason2 = {
          name: getTestEntityValue('rcr2'),
          description: '',
          publicDescription: '',
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
          cy.getCancellationReasonsApi({
            limit: 1,
            query: `name=="${firstCancelReason.name}"`,
          }).then((cancellationReasons) => {
            RequestCancellationReasonsConsortiumManager.deleteViaApi({
              payload: {
                name: firstCancelReason.name,
                id: cancellationReasons[0].id,
                source: 'consortium',
              },
              settingId: cancellationReasons[0].id,
              url: '/cancellation-reason-storage/cancellation-reasons',
            });
          });
        });

        it(
          'C410843 Request cancellation reason can be shared to all tenants in "Consortium manager" app regardless permission and affiliation (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);
            RequestCancellationReasonsConsortiumManager.choose();
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );

            ConsortiaControlledVocabularyPaneset.createViaUi(true, firstCancelReason);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.pleaseFillIn,
            });

            firstCancelReason.name = getTestEntityValue('rcr1');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: firstCancelReason.name });
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(firstCancelReason.name);
            ConfirmShare.clickConfirm();
            RequestCancellationReasonsConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(firstCancelReason.name, 'All'));
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [...Object.values(firstCancelReason), 'All'],
              ['edit', 'trash'],
            );

            ConsortiaControlledVocabularyPaneset.createViaUi(true, secondCancelReason2);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(secondCancelReason2.name);
            ConfirmShare.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            cy.logout();
            cy.login(userBData.username, userBData.password, {
              path: SettingsMenu.circulationRequestCancellationReasonsPath,
              waiter: () => cy.wait(4000),
            });
            CancellationReason.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              Object.values(firstCancelReason),
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            cy.wait(4000);
            CancellationReason.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              Object.values(firstCancelReason),
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
            cy.wait(4000);
            CancellationReason.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              Object.values(firstCancelReason),
            );
          },
        );
      });
    });
  });
});
