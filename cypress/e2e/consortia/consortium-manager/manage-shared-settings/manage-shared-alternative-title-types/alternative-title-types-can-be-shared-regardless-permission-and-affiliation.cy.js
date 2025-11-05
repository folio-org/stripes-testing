import moment from 'moment';
import { calloutTypes } from '../../../../../../interactors';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import AlternativeTitleTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/alternativeTitleTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Classification identifier types', () => {
        let userAData;
        let userBData;
        const alternativeTitleTypes4 = {
          name: '',
        };
        const alternativeTitleTypes5 = {
          name: getTestEntityValue('AlternativeTitleTypes5'),
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.crudAlternativeTitleTypes.gui,
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
              cy.createTempUser([Permissions.crudAlternativeTitleTypes.gui]).then(
                (userProperties) => {
                  userBData = userProperties;
                  cy.assignAffiliationToUser(Affiliations.College, userBData.userId);
                  cy.setTenant(Affiliations.College);
                  cy.assignPermissionsToExistingUser(userBData.userId, [
                    Permissions.crudAlternativeTitleTypes.gui,
                  ]);
                  cy.resetTenant();
                  cy.getAdminToken();
                  cy.assignAffiliationToUser(Affiliations.University, userBData.userId);
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(userBData.userId, [
                    Permissions.crudAlternativeTitleTypes.gui,
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
          cy.getAlternativeTitlesTypes({
            limit: 1,
            query: `name=="${alternativeTitleTypes4.name}"`,
          }).then((atpResp) => {
            const atpId = atpResp[0].id;
            AlternativeTitleTypesConsortiumManager.deleteViaApi({
              payload: {
                name: alternativeTitleTypes4.name,
                id: atpId,
                source: 'consortium',
              },
              settingId: atpId,
              url: '/alternative-title-types',
            });
          });
        });

        it(
          'C410877 Alternative title type can be shared to all tenants in "Consortium manager" app regardless permission and affiliation (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C410877'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            AlternativeTitleTypesConsortiumManager.choose();
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );

            ConsortiaControlledVocabularyPaneset.createViaUi(true, alternativeTitleTypes4);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.pleaseFillIn,
            });

            alternativeTitleTypes4.name = getTestEntityValue('AlternativeTitleTypes4');
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: alternativeTitleTypes4.name,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            const rowDataToCheck = [
              alternativeTitleTypes4.name,
              'consortium',
              moment().format('l'),
              'All',
            ];

            ConfirmShare.waitLoadingConfirmShareToAll(alternativeTitleTypes4.name);
            ConfirmShare.clickConfirm();
            AlternativeTitleTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(alternativeTitleTypes4.name, 'All'));
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, alternativeTitleTypes5);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(alternativeTitleTypes5.name);
            ConfirmShare.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            cy.logout();
            cy.login(userBData.username, userBData.password, {
              path: SettingsMenu.alternativeTitleTypes,
              waiter: () => cy.wait(3000),
            });
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.alternativeTitleTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.alternativeTitleTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));
          },
        );
      });
    });
  });
});
