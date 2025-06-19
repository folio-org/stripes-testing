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
      describe('Manage shared Instance note types', () => {
        let userData;
        const natureContent3 = { name: getTestEntityValue('natureContent3') };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.crudNatureOfContent.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.crudNatureOfContent.gui,
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
          NatureOfContent.getViaApi({
            limit: 1,
            query: `name=="${natureContent3.name}"`,
          }).then((nocResp) => {
            const nocId = nocResp.natureOfContentTerms[0].id;
            NatureOfContentConsortiumManager.deleteViaApi({
              payload: {
                name: natureContent3.name,
                id: nocId,
                source: 'consortium',
              },
              settingId: nocId,
              url: '/nature-of-content-terms',
            });
          });
        });

        it(
          'C411302 User with "Consortium manager: Can share settings to all members" permission is able to add/edit nature of content shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
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
            NatureOfContentConsortiumManager.choose();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, natureContent3);
            ConsortiaControlledVocabularyPaneset.clickSave();
            let createdCIT = [natureContent3.name, 'consortium', moment().format('l'), 'All'];

            ConfirmShare.waitLoadingConfirmShareToAll(natureContent3.name);
            ConfirmShare.clickConfirm();
            NatureOfContentConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(natureContent3.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT, [
              'edit',
              'trash',
            ]);

            cy.visit(SettingsMenu.natureOfContent);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.natureOfContent);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            NatureOfContentConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(
              natureContent3.name,
              actionIcons.edit,
            );

            natureContent3.name = getTestEntityValue('SharedNOC3Edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: natureContent3.name,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            createdCIT = [natureContent3.name, 'consortium', moment().format('l'), 'All'];

            ConfirmShare.waitLoadingConfirmShareToAll(natureContent3.name);
            ConfirmShare.clickConfirm();
            NatureOfContentConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.updated(natureContent3.name, 'All'));

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

            cy.visit(SettingsMenu.natureOfContent);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.natureOfContent);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));
          },
        );
      });
    });
  });
});
