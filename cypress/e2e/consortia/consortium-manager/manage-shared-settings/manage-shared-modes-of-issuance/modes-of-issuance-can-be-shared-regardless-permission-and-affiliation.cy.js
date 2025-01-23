import { calloutTypes } from '../../../../../../interactors';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ModesOfIssuanceConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/modesOfIssuanceConsortiumManager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Modes of issuance', () => {
        let userAData;
        let userBData;
        const modesIssuance4 = { name: '' };
        const modesIssuance5 = { name: getTestEntityValue('modesIssuance5') };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
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
              cy.createTempUser([Permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui]).then(
                (userProperties) => {
                  userBData = userProperties;
                  cy.assignAffiliationToUser(Affiliations.College, userBData.userId);
                  cy.setTenant(Affiliations.College);
                  cy.assignPermissionsToExistingUser(userBData.userId, [
                    Permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
                  ]);
                  cy.resetTenant();
                  cy.getAdminToken();
                  cy.assignAffiliationToUser(Affiliations.University, userBData.userId);
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(userBData.userId, [
                    Permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
                  ]);
                },
              );
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
          cy.getModesOfIssuance({
            limit: 1,
            query: `name=="${modesIssuance4.name}"`,
          }).then(({ id }) => {
            ModesOfIssuanceConsortiumManager.deleteViaApi({
              payload: {
                name: modesIssuance4.name,
                id,
                source: 'consortium',
              },
              settingId: id,
              url: '/modes-of-issuance',
            });
          });
        });

        it(
          'C410955 Mode of issuance can be shared to all tenants in "Consortium manager" app regardless permission and affiliation (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp('Consortium manager');
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ModesOfIssuanceConsortiumManager.choose();
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );

            ConsortiaControlledVocabularyPaneset.createViaUi(true, modesIssuance4);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.pleaseFillIn,
            });

            modesIssuance4.name = getTestEntityValue('modesIssuance4Edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: modesIssuance4.name,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(modesIssuance4.name);
            ConfirmShare.clickConfirm();
            ModesOfIssuanceConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(modesIssuance4.name, 'All'));
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(modesIssuance4.name, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, modesIssuance5);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(modesIssuance5.name);
            ConfirmShare.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            cy.logout();
            cy.login(userBData.username, userBData.password);
            cy.visit(SettingsMenu.modesOfIssuancePath);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(modesIssuance4.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.modesOfIssuancePath);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(modesIssuance4.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.modesOfIssuancePath);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(modesIssuance4.name);
          },
        );
      });
    });
  });
});
