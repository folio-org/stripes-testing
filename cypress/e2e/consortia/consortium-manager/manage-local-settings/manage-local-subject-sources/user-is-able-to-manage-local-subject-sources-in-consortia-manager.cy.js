import { calloutTypes } from '../../../../../../interactors';
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
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import InteractorsTools from '../../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortium manager', () => {
  describe('Manage local settings', () => {
    describe('Manage local Subject sources', () => {
      let user;
      const subjectSource = {
        name: `C594434 subjectSource_${getRandomPostfix()}`,
        source: 'local',
      };
      const editedSubjectSourceName = `C594434 subjectSource_${getRandomPostfix()} edited`;
      const canceledSubjectSourceName = `C594434 subjectSource_${getRandomPostfix()}`;
      const calloutMessage = `You do not have permissions at one or more members: ${tenantNames.college}`;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
          ]);

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.University, user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(user.userId, [
            Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
          ]);
          cy.resetTenant();

          cy.login(user.username, user.password);
          ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete users data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C594434 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local subjects of selected affiliated tenants in "Consortium manager" app (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C594434'] },
        () => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManager.waitLoading();
          SelectMembersModal.selectAllMembers();
          ConsortiumManager.verifyStatusOfConsortiumManager(3);
          ConsortiumManager.chooseSettingsItem(settingsItems.inventory);
          ConsortiumSubjectSources.choose();
          InteractorsTools.checkCalloutMessage(calloutMessage, calloutTypes.error);

          ConsortiumSubjectSources.createLocalSubjectSource(subjectSource.name);
          ConsortiumSubjectSources.confirmSaveForMemberLibraries(
            subjectSource.name,
            tenantNames.college,
            tenantNames.central,
            tenantNames.university,
          );
          ConsortiumSubjectSources.verifyThreeLocalSubjectSourcesExist(
            subjectSource.name,
            user.lastName,
          );

          ConsortiumSubjectSources.editSubjectSourceByTenantName(
            subjectSource.name,
            editedSubjectSourceName,
            user.lastName,
            tenantNames.university,
          );
          ConsortiumSubjectSources.verifyLocalSubjectSourceExists(
            editedSubjectSourceName,
            tenantNames.university,
            subjectSource.source,
            { actions: ['edit', 'trash'] },
          );
          ConsortiumSubjectSources.verifyLocalSubjectSourceNotEdited(subjectSource.name);
          ConsortiumSubjectSources.verifyNewAndSelectMembersButtonsState();

          ConsortiumSubjectSources.deleteSubjectSourceByUserAndTenantNames(
            subjectSource.name,
            user.lastName,
            tenantNames.college,
          );
          ConsortiumSubjectSources.verifySubjectSourceWithUserAndTenantNamesAbsent(
            user.lastName,
            tenantNames.college,
          );
          [tenantNames.central, tenantNames.university].forEach((tenant) => {
            ConsortiumSubjectSources.verifySubjectSourceWithUserAndTenantNamesExist(
              subjectSource.name,
              user.lastName,
              tenant,
            );
          });

          ConsortiumSubjectSources.createLocalSubjectSource(canceledSubjectSourceName);
          ConsortiumSubjectSources.clickKeepEditingAndVerifyEditMode(canceledSubjectSourceName);
          ConsortiumSubjectSources.clickCancelButton();
          ConsortiumSubjectSources.verifySubjectSourceAbsent(canceledSubjectSourceName);

          ConsortiumSubjectSources.createLocalSubjectSource(subjectSource.name, 'duplicate');
          ConsortiumSubjectSources.clickCancelButton();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.INVENTORY);
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
          SubjectSources.verifySubjectSourceExists(
            subjectSource.name,
            subjectSource.source,
            user.lastName,
            { actions: ['edit', 'trash'] },
          );

          cy.resetTenant();
          ConsortiumManagerSettings.switchActiveAffiliation(
            tenantNames.central,
            tenantNames.college,
          );
          ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.INVENTORY);
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
          SubjectSources.verifySubjectSourceAbsent(subjectSource.name);

          cy.resetTenant();
          ConsortiumManagerSettings.switchActiveAffiliation(
            tenantNames.college,
            tenantNames.university,
          );
          ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.university);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.INVENTORY);
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
          SubjectSources.verifySubjectSourceExists(
            editedSubjectSourceName,
            subjectSource.source,
            user.lastName,
            { actions: ['edit', 'trash'] },
          );
        },
      );
    });
  });
});
