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
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import PatronGroupsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/patronGroupsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Patron groups', () => {
        let userData;
        const sharedPatronGroups3 = {
          group: getTestEntityValue('SharedPatronGroups3'),
          desc: getTestEntityValue('SP3'),
          expirationOffsetInDays: '365',
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.uiUsersViewPatronGroups.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.uiUsersViewPatronGroups.gui,
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
          cy.getUserGroups({
            limit: 1,
            query: `group=="${sharedPatronGroups3.group}"`,
          }).then((id) => {
            PatronGroupsConsortiumManager.deleteViaApi({
              payload: {
                group: sharedPatronGroups3.group,
                desc: sharedPatronGroups3.desc,
                id,
                source: 'consortium',
              },
              settingId: id,
              url: '/groups',
            });
          });
        });

        it(
          'C407763 User with "Consortium manager: Can share settings to all members" permission is able to add/edit patron group shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C407763'] },
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

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
            PatronGroupsConsortiumManager.choose();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, sharedPatronGroups3);
            ConsortiaControlledVocabularyPaneset.clickSave();
            let rowDataToCheck = [
              ...Object.values(sharedPatronGroups3),
              moment().format('l'),
              'All',
            ];

            ConfirmShare.waitLoadingConfirmShareToAll(sharedPatronGroups3.group);
            ConfirmShare.clickConfirm();
            ConsortiumManagerApp.checkMessage(messages.created(sharedPatronGroups3.group, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            cy.visit(SettingsMenu.patronGroups);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.patronGroups);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
            PatronGroupsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(
              sharedPatronGroups3.group,
              actionIcons.edit,
            );

            sharedPatronGroups3.group = getTestEntityValue('SharedPatronGroups3Edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              group: sharedPatronGroups3.group,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            rowDataToCheck = [...Object.values(sharedPatronGroups3), moment().format('l'), 'All'];

            ConfirmShare.waitLoadingConfirmShareToAll(sharedPatronGroups3.group);
            ConfirmShare.clickConfirm();
            ConsortiumManagerApp.checkMessage(messages.updated(sharedPatronGroups3.group, 'All'));

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

            cy.visit(SettingsMenu.patronGroups);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.patronGroups);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));
          },
        );
      });
    });
  });
});
