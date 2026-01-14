import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import PatronGroupsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/patronGroupsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import PatronGroups from '../../../../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Patron groups', () => {
        let userAData;
        let userBData;
        let sharedPatronGroup = {
          payload: {
            group: getTestEntityValue('SharedPatronGroup'),
          },
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              PatronGroupsConsortiumManager.createViaApi(sharedPatronGroup).then(
                (newPatronGroup) => {
                  sharedPatronGroup = newPatronGroup;
                },
              );
              cy.setTenant(Affiliations.College);
              cy.createTempUser([], sharedPatronGroup.payload.group).then((userAProperties) => {
                userAData = userAProperties;
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.consortiaSettingsConsortiumManagerPatronGroupsAll.gui,
              ])
                .then((userBProperties) => {
                  userBData = userBProperties;
                  cy.assignAffiliationToUser(Affiliations.College, userBData.userId);
                  cy.setTenant(Affiliations.College);
                  cy.assignPermissionsToExistingUser(userBData.userId, [
                    Permissions.consortiaSettingsConsortiumManagerPatronGroupsAll.gui,
                  ]);
                  cy.resetTenant();
                  cy.getAdminToken();
                  cy.assignAffiliationToUser(Affiliations.University, userBData.userId);
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(userBData.userId, [
                    Permissions.consortiaSettingsConsortiumManagerPatronGroupsAll.gui,
                  ]);
                })
                .then(() => {
                  cy.resetTenant();
                  cy.login(userBData.username, userBData.password);
                });
            });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userBData.userId);
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userAData.userId);
          cy.getUserGroups({
            limit: 1,
            query: `group=="${sharedPatronGroup.payload.group}"`,
          }).then((id) => {
            PatronGroups.deleteViaApi(id);
          });
        });

        it(
          'C411703 Delete shared setting is successful in some of the selected member libraries (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411703'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
            PatronGroupsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [sharedPatronGroup.payload.group, '', '', moment().format('l'), 'All'],
              ['edit', 'trash'],
            );

            ConsortiaControlledVocabularyPaneset.performAction(
              sharedPatronGroup.payload.group,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              'patron group',
              sharedPatronGroup.payload.group,
            );

            DeleteCancelReason.clickDelete();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              sharedPatronGroup.payload.group,
              'All',
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              sharedPatronGroup.payload.group,
              tenantNames.college,
              [sharedPatronGroup.payload.group, '', '', moment().format('l'), tenantNames.college],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              sharedPatronGroup.payload.group,
              tenantNames.central,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              sharedPatronGroup.payload.group,
              tenantNames.university,
            );

            cy.visit(SettingsMenu.patronGroups);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              sharedPatronGroup.payload.group,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.patronGroups);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [sharedPatronGroup.payload.group, '', '', moment().format('l')],
              ['edit', 'trash'],
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.patronGroups);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              sharedPatronGroup.payload.group,
            );
          },
        );
      });
    });
  });
});
