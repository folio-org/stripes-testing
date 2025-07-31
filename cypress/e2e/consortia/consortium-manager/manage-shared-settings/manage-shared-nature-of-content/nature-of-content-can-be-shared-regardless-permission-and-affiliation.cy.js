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
import NatureOfContentConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/natureOfContentConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import NatureOfContent from '../../../../../support/fragments/settings/inventory/instances/natureOfContent';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Nature of content', () => {
        let userAData;
        let userBData;
        const natureContent4 = { name: '' };
        const natureContent5 = { name: getTestEntityValue('natureContent5') };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.crudNatureOfContent.gui,
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
              cy.createTempUser([Permissions.crudNatureOfContent.gui]).then((userProperties) => {
                userBData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userBData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userBData.userId, [
                  Permissions.crudNatureOfContent.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userBData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userBData.userId, [
                  Permissions.crudNatureOfContent.gui,
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
          NatureOfContent.getViaApi({
            limit: 1,
            query: `name=="${natureContent4.name}"`,
          }).then((nocResp) => {
            const nocId = nocResp.natureOfContentTerms[0].id;
            NatureOfContentConsortiumManager.deleteViaApi({
              payload: {
                name: natureContent4.name,
                id: nocId,
                source: 'consortium',
              },
              settingId: nocId,
              url: '/nature-of-content-terms',
            });
          });
        });

        it(
          'C411303 Nature of content can be shared to all tenants in "Consortium manager" app regardless permission and affiliation  (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411303'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            NatureOfContentConsortiumManager.choose();
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );

            ConsortiaControlledVocabularyPaneset.createViaUi(true, natureContent4);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.pleaseFillIn,
            });

            natureContent4.name = getTestEntityValue('natureContent4Edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: natureContent4.name,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            const createdCIT = [natureContent4.name, 'consortium', moment().format('l'), 'All'];

            ConfirmShare.waitLoadingConfirmShareToAll(natureContent4.name);
            ConfirmShare.clickConfirm();
            NatureOfContentConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(natureContent4.name, 'All'));
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, natureContent5);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(natureContent5.name);
            ConfirmShare.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            cy.login(userBData.username, userBData.password);
            cy.visit(SettingsMenu.natureOfContent);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.natureOfContent);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.natureOfContent);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));
          },
        );
      });
    });
  });
});
