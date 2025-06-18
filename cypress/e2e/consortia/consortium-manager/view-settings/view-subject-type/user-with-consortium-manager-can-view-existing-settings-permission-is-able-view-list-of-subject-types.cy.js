import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SubjectTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
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
          memberLibrares: 'All',
          id: uuid(),
        };
        const localSubjectTypeOnCentral = {
          name: `C594397 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibrares: 'Consortium',
        };
        const localSubjectTypeOnCollege = {
          name: `C594397 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibrares: 'College',
        };
        const localSubjectTypeOnUniversity = {
          name: `C594397 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibrares: 'University',
        };
        const settingsList = Object.values(settingsItems);

        before('Create test data and login', () => {
          cy.getAdminToken();
          cy.getConsortiaId().then((id) => {
            consortiaId = id;

            SubjectTypesConsortiumManager.createSharedSubjectTypeViaApi(
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
          });
        });

        after('Delete users data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          SubjectTypesConsortiumManager.deleteSharedSubjectTypeViaApi(
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
          SelectMembers.verifyMembersFound(members);
          SelectMembers.verifyTotalSelected(total);
          SelectMembers.verifyAvailableTenants(tenants);
        };

        const verifyConsortiumManagerAfterSelectMembersSave = (setting, members) => {
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.waitLoading();
          ConsortiumManagerApp.verifySettingPaneIsDisplayed();
          ConsortiumManagerApp.verifyPaneIncludesSettings(setting);
          ConsortiumManagerApp.verifySelectedSettingIsDisplayed('Subject types');
          ConsortiumManagerApp.verifyMembersSelected(members);
          ConsortiumManagerApp.verifySelectMembersButton();
        };

        it(
          'C594397 User with "Consortium manager: Can view existing settings" permission is able to view the list of subject types of affiliated tenants in "Consortium manager" app (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594397'] },
          () => {
            cy.login(user.username, user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            SubjectTypesConsortiumManager.choose();
            SubjectTypesConsortiumManager.verifySubjectTypeExists(
              sharedSubjectType.name,
              sharedSubjectType.memberLibrares,
              sharedSubjectType.source,
            );
            SubjectTypesConsortiumManager.verifySubjectTypeExists(
              localSubjectTypeOnCentral.name,
              localSubjectTypeOnCentral.memberLibrares,
              localSubjectTypeOnCentral.source,
              { actions: ['edit', 'trash'] },
            );
            SubjectTypesConsortiumManager.verifySubjectTypeExists(
              localSubjectTypeOnCollege.name,
              localSubjectTypeOnCollege.memberLibrares,
              localSubjectTypeOnCollege.source,
              { actions: ['edit', 'trash'] },
            );
            SubjectTypesConsortiumManager.verifySubjectTypeExists(
              localSubjectTypeOnUniversity.name,
              localSubjectTypeOnUniversity.memberLibrares,
              localSubjectTypeOnUniversity.source,
              { actions: ['edit', 'trash'] },
            );

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
            SelectMembers.selectMembers(tenantNames.central);
            verifyFoundMembersAndTotalSelected(3, 2, [tenantNames.college, tenantNames.university]);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, true);
            SelectMembers.verifyMemberIsSelected(tenantNames.university, true);
            verifyConsortiumManagerAfterSelectMembersSave(settingsList, 2);
            SubjectTypesConsortiumManager.verifySubjectTypeExists(
              sharedSubjectType.name,
              sharedSubjectType.memberLibrares,
              sharedSubjectType.source,
            );
            SubjectTypesConsortiumManager.verifySourceTypeAbsent(localSubjectTypeOnCentral.name);
            SubjectTypesConsortiumManager.verifySubjectTypeExists(
              localSubjectTypeOnCollege.name,
              localSubjectTypeOnCollege.memberLibrares,
              localSubjectTypeOnCollege.source,
              { actions: ['edit', 'trash'] },
            );
            SubjectTypesConsortiumManager.verifySubjectTypeExists(
              localSubjectTypeOnUniversity.name,
              localSubjectTypeOnUniversity.memberLibrares,
              localSubjectTypeOnUniversity.source,
              { actions: ['edit', 'trash'] },
            );
          },
        );
      });
    });
  });
});
