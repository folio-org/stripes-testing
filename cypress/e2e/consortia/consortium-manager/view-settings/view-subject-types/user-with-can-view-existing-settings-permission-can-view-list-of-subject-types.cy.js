import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumSubjectTypes from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';
import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManagerSettings from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectTypes from '../../../../../support/fragments/settings/inventory/instances/subjectTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject types', () => {
        let user;
        let consortiaId;
        const sharedSubjectType = {
          name: `C594397 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'consortium',
          memberLibraries: 'All',
          user: 'No set value- ',
          id: uuid(),
        };
        const localSubjectTypeOnCentral = {
          name: `C594397 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibraries: 'Consortium',
        };
        const localSubjectTypeOnCollege = {
          name: `C594397 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibraries: 'College',
        };
        const localSubjectTypeOnUniversity = {
          name: `C594397 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibraries: 'University',
        };
        const settingsList = Object.values(settingsItems);

        before('Create test data and login', () => {
          cy.getAdminToken();
          cy.getConsortiaId().then((id) => {
            consortiaId = id;

            ConsortiumSubjectTypes.createSharedSubjectTypeViaApi(
              sharedSubjectType.id,
              sharedSubjectType.name,
              consortiaId,
            );
          });
          SubjectTypes.createViaApi({
            source: localSubjectTypeOnCentral.source,
            name: localSubjectTypeOnCentral.name,
          }).then((response) => {
            localSubjectTypeOnCentral.id = response.body.id;
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
          ]).then((createdUserProperties) => {
            user = createdUserProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            SubjectTypes.createViaApi({
              source: localSubjectTypeOnCollege.source,
              name: localSubjectTypeOnCollege.name,
            }).then((response) => {
              localSubjectTypeOnCollege.id = response.body.id;
            });
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
            ]);

            cy.resetTenant();
            cy.getAdminToken();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.University);
            SubjectTypes.createViaApi({
              source: localSubjectTypeOnUniversity.source,
              name: localSubjectTypeOnUniversity.name,
            }).then((response) => {
              localSubjectTypeOnUniversity.id = response.body.id;
            });
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
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
          ConsortiumSubjectTypes.deleteSharedSubjectTypeViaApi(
            consortiaId,
            sharedSubjectType.id,
            sharedSubjectType.name,
          );
          SubjectTypes.deleteViaApi(localSubjectTypeOnCentral.id);
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          SubjectTypes.deleteViaApi(localSubjectTypeOnCollege.id);
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.University);
          SubjectTypes.deleteViaApi(localSubjectTypeOnUniversity.id);
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
          ConsortiumManager.verifySelectedSettingIsDisplayed('Subject types');
          ConsortiumManager.verifyMembersSelected(members);
          ConsortiumManager.verifySelectMembersButton();
        };

        it(
          'C594397 User with "Consortium manager: Can view existing settings" permission is able to view the list of subject types of affiliated tenants in "Consortium manager" app (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594397'] },
          () => {
            SelectMembersModal.selectAllMembers();
            ConsortiumManager.verifyStatusOfConsortiumManager(3);
            ConsortiumManager.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectTypes.choose();
            ConsortiumSubjectTypes.verifySharedToAllMembersSubjectTypeExists(
              sharedSubjectType.name,
              sharedSubjectType.source,
              sharedSubjectType.user,
              sharedSubjectType.memberLibraries,
            );
            ConsortiumSubjectTypes.verifyLocalSubjectTypeExists(
              localSubjectTypeOnCentral.name,
              localSubjectTypeOnCentral.memberLibraries,
              localSubjectTypeOnCentral.source,
              { actions: ['edit', 'trash'] },
            );
            ConsortiumSubjectTypes.verifyLocalSubjectTypeExists(
              localSubjectTypeOnCollege.name,
              localSubjectTypeOnCollege.memberLibraries,
              localSubjectTypeOnCollege.source,
              { actions: ['edit', 'trash'] },
            );
            ConsortiumSubjectTypes.verifyLocalSubjectTypeExists(
              localSubjectTypeOnUniversity.name,
              localSubjectTypeOnUniversity.memberLibraries,
              localSubjectTypeOnUniversity.source,
              { actions: ['edit', 'trash'] },
            );

            ConsortiumManager.clickSelectMembers();
            SelectMembersModal.verifyStatusOfSelectMembersModal(3, 3, true);
            SelectMembersModal.selectMembers(tenantNames.central);
            verifyFoundMembersAndTotalSelected(3, 2, [tenantNames.college, tenantNames.university]);
            SelectMembersModal.verifyMemberIsSelected(tenantNames.college, true);
            SelectMembersModal.verifyMemberIsSelected(tenantNames.university, true);
            verifyConsortiumManagerAfterSelectMembersSave(settingsList, 2);
            ConsortiumSubjectTypes.verifySharedToAllMembersSubjectTypeExists(
              sharedSubjectType.name,
              sharedSubjectType.source,
              sharedSubjectType.user,
              sharedSubjectType.memberLibraries,
            );
            ConsortiumSubjectTypes.verifySubjectTypeAbsent(localSubjectTypeOnCentral.name);
            ConsortiumSubjectTypes.verifyLocalSubjectTypeExists(
              localSubjectTypeOnCollege.name,
              localSubjectTypeOnCollege.memberLibraries,
              localSubjectTypeOnCollege.source,
              { actions: ['edit', 'trash'] },
            );
            ConsortiumSubjectTypes.verifyLocalSubjectTypeExists(
              localSubjectTypeOnUniversity.name,
              localSubjectTypeOnUniversity.memberLibraries,
              localSubjectTypeOnUniversity.source,
              { actions: ['edit', 'trash'] },
            );
          },
        );
      });
    });
  });
});
