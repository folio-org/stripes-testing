import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import { classificationBrowseSectionName } from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';
import { identifierTypesSectionName } from '../../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import { APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      describe('Consortia', () => {
        let user;

        before('Create user, login', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
            Permissions.crudClassificationIdentifierTypes.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.crudClassificationIdentifierTypes.gui,
            ]);

            cy.login(user.username, user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
          });
        });

        after('Delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        });

        it(
          'C451649 User without permission on Central tenant cannot see "Classification browse" pane from Member tenant when he has permission on Member tenant (spitfire)',
          { tags: ['criticalPathECS', 'spitfire'] },
          () => {
            SettingsPane.checkOptionInSecondPaneExists(identifierTypesSectionName);
            SettingsPane.checkOptionInSecondPaneExists(classificationBrowseSectionName, false);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            SettingsPane.waitLoading();
            SettingsPane.checkOptionInSecondPaneExists(identifierTypesSectionName);
            SettingsPane.checkOptionInSecondPaneExists(classificationBrowseSectionName, false);
          },
        );
      });
    });
  });
});
