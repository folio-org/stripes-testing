import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create', () => {
      describe('Consortia', () => {
        const userPermissionsMember = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
        ];
        const userPermissionsCentral = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ];
        const user = {};

        before('Create user, login', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.createTempUser(userPermissionsCentral).then((userProperties) => {
            user.userProperties = userProperties;

            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.College, user.userProperties.userId);

            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userProperties.userId, userPermissionsMember);

            cy.resetTenant();
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();

          Users.deleteViaApi(user.userProperties.userId);
        });

        it(
          'C422254 "New" option is not displayed in "Actions" menu when user doesn\'t have required permissions - Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C422254'] },
          () => {
            // Step 1: Click Actions
            MarcAuthorities.clickActionsButton();

            // Verify that "New" option is not displayed
            MarcAuthorities.checkButtonNewExistsInActionDropdown(false);
          },
        );
      });
    });
  });
});
