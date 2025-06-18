import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import InstanceNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/instanceNoteTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InstanceNoteTypes from '../../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Instance note types', () => {
        let userData;
        const instanceNote3 = { name: getTestEntityValue('SharedInstanceNote3') };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.crudInstanceNoteTypes.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.crudInstanceNoteTypes.gui,
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
          InstanceNoteTypes.getInstanceNoteTypesViaApi({
            limit: 1,
            query: `name=="${instanceNote3.name}"`,
          }).then((intResp) => {
            const citId = intResp.instanceNoteTypes[0].id;
            InstanceNoteTypesConsortiumManager.deleteViaApi({
              payload: {
                name: instanceNote3.name,
                id: citId,
                source: 'consortium',
              },
              settingId: citId,
              url: '/instance-note-types',
            });
          });
        });

        it(
          'C410932 User with "Consortium manager: Can share settings to all members" permission is able to add/edit instance note type shared to all affiliated tenants in "Consortium manager" app  (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
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

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            InstanceNoteTypesConsortiumManager.choose();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, instanceNote3);
            ConsortiaControlledVocabularyPaneset.clickSave();
            let createdCIT = [instanceNote3.name, 'consortium', moment().format('l'), 'All'];

            ConfirmShare.waitLoadingConfirmShareToAll(instanceNote3.name);
            ConfirmShare.clickConfirm();
            InstanceNoteTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(instanceNote3.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT, [
              'edit',
              'trash',
            ]);

            cy.visit(SettingsMenu.instanceNoteTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.instanceNoteTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            InstanceNoteTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(
              instanceNote3.name,
              actionIcons.edit,
            );

            instanceNote3.name = getTestEntityValue('SharedINT3Edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: instanceNote3.name,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            createdCIT = [instanceNote3.name, 'consortium', moment().format('l'), 'All'];

            ConfirmShare.waitLoadingConfirmShareToAll(instanceNote3.name);
            ConfirmShare.clickConfirm();
            InstanceNoteTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.updated(instanceNote3.name, 'All'));

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

            cy.visit(SettingsMenu.instanceNoteTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.instanceNoteTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));
          },
        );
      });
    });
  });
});
