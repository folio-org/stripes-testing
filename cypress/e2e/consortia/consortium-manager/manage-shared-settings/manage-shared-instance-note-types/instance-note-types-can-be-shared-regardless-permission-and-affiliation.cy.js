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
import InstanceNoteTypes from '../../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import InstanceNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/instanceNoteTypesConsortiumManager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Instance note types', () => {
        let userAData;
        let userBData;
        const instanceNote4 = { name: '' };
        const instanceNote5 = { name: getTestEntityValue('SharedInstanceNote5') };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.crudInstanceNoteTypes.gui,
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
              cy.createTempUser([Permissions.crudInstanceNoteTypes.gui]).then((userProperties) => {
                userBData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userBData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userBData.userId, [
                  Permissions.crudInstanceNoteTypes.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userBData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userBData.userId, [
                  Permissions.crudInstanceNoteTypes.gui,
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
          InstanceNoteTypes.getInstanceNoteTypesViaApi({
            limit: 1,
            query: `name=="${instanceNote4.name}"`,
          }).then((intResp) => {
            const citId = intResp.instanceNoteTypes[0].id;
            InstanceNoteTypesConsortiumManager.deleteViaApi({
              payload: {
                name: instanceNote4.name,
                id: citId,
                source: 'consortium',
              },
              settingId: citId,
              url: '/instance-note-types',
            });
          });
        });

        it(
          'C410933 Instance note type can be shared to all tenants in "Consortium manager" app regardless permission and affiliation  (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp('Consortium manager');
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            InstanceNoteTypesConsortiumManager.choose();
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );

            ConsortiaControlledVocabularyPaneset.createViaUi(true, instanceNote4);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.pleaseFillIn,
            });

            instanceNote4.name = getTestEntityValue('SharedINT4Edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: instanceNote4.name,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(instanceNote4.name);
            ConfirmShare.clickConfirm();
            InstanceNoteTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(instanceNote4.name, 'All'));
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(instanceNote4.name, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, instanceNote5);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(instanceNote5.name);
            ConfirmShare.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            cy.logout();
            cy.login(userBData.username, userBData.password);
            cy.visit(SettingsMenu.instanceNoteTypes);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(instanceNote4.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.instanceNoteTypes);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(instanceNote4.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.instanceNoteTypes);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(instanceNote4.name);
          },
        );
      });
    });
  });
});
