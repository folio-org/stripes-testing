import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumSubjectSources from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectSourcesConsortiumManager';
import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManagerSettings from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectSources from '../../../../../support/fragments/settings/inventory/instances/subjectSources';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Subject sources', () => {
        let user;
        let consortiaId;
        const sharedSubjectSource = {
          name: `C594421 autotestSubjectSourceName${getRandomPostfix()}`,
          source: 'consortium',
          memberLibraries: 'All',
          user: 'No set value-',
          id: uuid(),
        };
        const localSubjectSourceOnCentral = {
          name: `C594421 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibraries: 'Consortium',
        };
        const localSubjectSourceOnCollege = {
          name: `C594421 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibraries: 'College',
        };
        const localSubjectSourceOnUniversity = {
          name: `C594421 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibraries: 'University',
        };
        const settingsList = Object.values(settingsItems);

        before('Create test data and login', () => {
          cy.getAdminToken();
          cy.getConsortiaId().then((id) => {
            consortiaId = id;

            ConsortiumSubjectSources.createSharedSubjectSourceViaApi(
              sharedSubjectSource.id,
              sharedSubjectSource.name,
              consortiaId,
            );
          });
          SubjectSources.createViaApi({
            source: localSubjectSourceOnCentral.source,
            name: localSubjectSourceOnCentral.name,
          }).then((response) => {
            localSubjectSourceOnCentral.id = response.body.id;
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
          ]).then((createdUserProperties) => {
            user = createdUserProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            SubjectSources.createViaApi({
              source: localSubjectSourceOnCollege.source,
              name: localSubjectSourceOnCollege.name,
            }).then((response) => {
              localSubjectSourceOnCollege.id = response.body.id;
            });
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
            ]);

            cy.resetTenant();
            cy.getAdminToken();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.University);
            SubjectSources.createViaApi({
              source: localSubjectSourceOnUniversity.source,
              name: localSubjectSourceOnUniversity.name,
            }).then((response) => {
              localSubjectSourceOnUniversity.id = response.body.id;
            });
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
            ]);
            cy.resetTenant();

            cy.login(user.username, user.password);
            ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManager.waitLoading();
          });
        });

        after('Delete users data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          ConsortiumSubjectSources.deleteViaApi(
            sharedSubjectSource.id,
            sharedSubjectSource.name,
            consortiaId,
          );
          SubjectSources.deleteViaApi(localSubjectSourceOnCentral.id);
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          SubjectSources.deleteViaApi(localSubjectSourceOnCollege.id);
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.University);
          SubjectSources.deleteViaApi(localSubjectSourceOnUniversity.id);
        });

        const verifyFoundMembersAndTotalSelected = (members, total, tenants) => {
          SelectMembersModal.verifyMembersFound(members);
          SelectMembersModal.verifyTotalSelected(total);
          SelectMembersModal.verifyAvailableTenants(tenants);
        };

        const verifyConsortiumManagerAfterSelectMembersSave = (setting, members) => {
          SelectMembersModal.saveAndClose();
          ConsortiumManager.waitLoading();
          ConsortiumManager.verifySettingPaneIsDisplayed();
          ConsortiumManager.verifyPaneIncludesSettings(setting);
          ConsortiumManager.verifySelectedSettingIsDisplayed('Subject sources');
          ConsortiumManager.verifyMembersSelected(members);
          ConsortiumManager.verifySelectMembersButton();
        };

        it(
          'C594421 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of subject sources of affiliated tenants in "Consortium manager" app (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594421'] },
          () => {
            SelectMembersModal.selectAllMembers();
            ConsortiumManager.verifyStatusOfConsortiumManager(3);
            ConsortiumManager.clickSelectMembers();
            SelectMembersModal.checkMember(tenantNames.university, false);
            verifyFoundMembersAndTotalSelected(3, 2, [tenantNames.central, tenantNames.college]);
            SelectMembersModal.saveAndClose();
            ConsortiumManager.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectSources.choose();
            ConsortiumSubjectSources.verifySharedSubjectSourceExists({
              name: sharedSubjectSource.name,
            });
            ConsortiumSubjectSources.verifyLocalSubjectSourceExists(
              localSubjectSourceOnCentral.name,
              localSubjectSourceOnCentral.memberLibraries,
              localSubjectSourceOnCentral.source,
              { actions: ['edit', 'trash'] },
            );
            ConsortiumSubjectSources.verifyLocalSubjectSourceExists(
              localSubjectSourceOnCollege.name,
              localSubjectSourceOnCollege.memberLibraries,
              localSubjectSourceOnCollege.source,
              { actions: ['edit', 'trash'] },
            );
            ConsortiumSubjectSources.verifySubjectSourceAbsent(localSubjectSourceOnUniversity.name);

            ConsortiumManager.clickSelectMembers();
            SelectMembersModal.verifyStatusOfSelectMembersModal(3, 2, false);
            SelectMembersModal.checkMember(tenantNames.college, false);
            verifyFoundMembersAndTotalSelected(3, 1, [tenantNames.central]);
            verifyConsortiumManagerAfterSelectMembersSave(settingsList, 1);

            ConsortiumSubjectSources.verifySharedSubjectSourceExists({
              name: sharedSubjectSource.name,
            });
            ConsortiumSubjectSources.verifyLocalSubjectSourceExists(
              localSubjectSourceOnCentral.name,
              localSubjectSourceOnCentral.memberLibraries,
              localSubjectSourceOnCentral.source,
              { actions: ['edit', 'trash'] },
            );
            ConsortiumSubjectSources.verifySubjectSourceAbsent(localSubjectSourceOnCollege.name);
            ConsortiumSubjectSources.verifySubjectSourceAbsent(localSubjectSourceOnUniversity.name);
          },
        );
      });
    });
  });
});
