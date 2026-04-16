import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        let user;

        const userPermissions = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.dataExportSettingsViewOnly.gui,
        ];

        const marcAuthorityOption = 'MARC authority';
        const softwareVersionsOption = 'Software versions';

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.createTempUser(userPermissions).then((userProperties) => {
            user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, userPermissions);
            cy.resetTenant();
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        });

        it(
          'C424002 User without permission "Settings (MARC authority): View authority files" at Central and Member tenants cannot see "Settings >> MARC authority" page on both tenants (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C424002'] },
          () => {
            cy.login(user.username, user.password, {
              path: TopMenu.settingsPath,
              waiter: SettingsPane.waitLoading,
            });

            // Step 1: Verify "MARC authority" section doesn't display in Settings pane at Central tenant
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            SettingsPane.verifyChooseSettingsIsDisplayed();
            SettingsPane.checkOptionInSecondPaneExists(softwareVersionsOption);
            SettingsPane.checkOptionInSecondPaneExists(marcAuthorityOption, false);

            // Step 2: Switch active affiliation to Member tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();

            // Verify "MARC authority" section doesn't display in Settings pane at Member tenant
            SettingsPane.verifyChooseSettingsIsDisplayed();
            SettingsPane.checkOptionInSecondPaneExists(softwareVersionsOption);
            SettingsPane.checkOptionInSecondPaneExists(marcAuthorityOption, false);
          },
        );
      });
    });
  });
});
