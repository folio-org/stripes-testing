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
import { calloutTypes } from '../../../../../../interactors';
import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject types', () => {
        let user;
        let consortiaId;
        const sharedSubjectType = {
          name: `C594399 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'consortium',
          memberLibraries: 'All',
          user: 'No value set-',
          id: uuid(),
        };
        const localSubjectTypeOnCentral = {
          name: `C594399 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibraries: 'Consortium',
        };
        const localSubjectTypeOnCollege = {
          name: `C594399 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibraries: 'College',
        };
        const localSubjectTypeOnUniversity = {
          name: `C594399 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'local',
          memberLibraries: 'University',
        };
        const settingsList = Object.values(settingsItems);
        const calloutMessage = `You do not have permissions at one or more members: ${tenantNames.college}`;

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
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
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
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.uiOrdersView.gui]);

            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.University);
            SubjectTypes.createViaApi({
              source: localSubjectTypeOnUniversity.source,
              name: localSubjectTypeOnUniversity.name,
            }).then((response) => {
              localSubjectTypeOnUniversity.id = response.body.id;
            });
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
          'C594399 User without "inventory-storage.subject-types.collection.get" permission is NOT able to view the list of subject types of affiliated tenants in "Consortium manager" app (consortia) (folijet)',
          { tags: ['extendedPathECS', 'folijet', 'C594399'] },
          () => {
            SelectMembersModal.selectAllMembers();
            ConsortiumManager.verifyStatusOfConsortiumManager(2);
            ConsortiumManager.verifyChooseSettingsIsDisplayed();
            ConsortiumManager.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectTypes.choose();
            InteractorsTools.checkCalloutMessage(calloutMessage, calloutTypes.error);
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
            ConsortiumSubjectTypes.verifySubjectTypeAbsent(localSubjectTypeOnCollege.name);
            ConsortiumSubjectTypes.verifySubjectTypeAbsent(localSubjectTypeOnUniversity.name);

            ConsortiumManager.clickSelectMembers();
            SelectMembersModal.verifyStatusOfSelectMembersModal(2, 2, true);
            SelectMembersModal.selectMembers(tenantNames.central);
            SelectMembersModal.selectMembers(tenantNames.college);
            verifyConsortiumManagerAfterSelectMembersSave(settingsList, 0);
            ConsortiumSubjectTypes.verifySubjectTypesListIsEmpty();
          },
        );
      });
    });
  });
});
