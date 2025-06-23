import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager from // settingsItems,
  '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
// import SubjectTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectSourcesConsortiumManager';
import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManagerSettings from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import SubjectTypes from '../../../../../support/fragments/settings/inventory/instances/subjectTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
// import Users from '../../../../../support/fragments/users/users';
// import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject types', () => {
        let user;
        // const subjectTypeName = `SubjectType_${getRandomPostfix()}`;
        // const updatedSubjectTypeName = `Updated_${getRandomPostfix()}`;

        before('Create user and login', () => {
          cy.clearCookies({ domain: null });
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
            ]);
            cy.resetTenant();

            cy.login(user.username, user.password);
            ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        it(
          'C594405 User with "Consortium manager: Can share settings to all members" permission is able to add/edit subject type shared to all affiliated tenants in "Consortium manager" app (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594405'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManager.waitLoading();
            SelectMembersModal.selectAllMembers();
            ConsortiumManager.verifyStatusOfConsortiumManager(2);

            ConsortiumManager.clickSelectMembers();
            SelectMembersModal.verifyStatusOfSelectMembersModal(2, 2, true);
            SelectMembersModal.checkMember(tenantNames.college, false);
            SelectMembersModal.verifyStatusOfSelectMembersModal(2, 1, false);
            SelectMembersModal.saveAndClose();
            ConsortiumManager.verifyMembersSelected(1);
            ConsortiumManager.verifySelectMembersButton();
            ConsortiumManager.verifyChooseSettingsIsDisplayed();

            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            // SubjectTypes.
          },
        );
      });
    });
  });
});
