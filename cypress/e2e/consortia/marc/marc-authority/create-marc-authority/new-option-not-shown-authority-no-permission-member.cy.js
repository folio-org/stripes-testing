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
        const userPermissionsCentral = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
        ];
        const userPermissionsMember = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ];
        const user = {};

        before('Create user, login', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.setTenant(Affiliations.College);
          cy.createTempUser(userPermissionsMember).then((userProperties) => {
            user.userProperties = userProperties;

            cy.resetTenant();
            cy.assignPermissionsToExistingUser(user.userProperties.userId, userPermissionsCentral);

            cy.setTenant(Affiliations.College);
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
        });

        after('Delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userProperties.userId);
        });

        it(
          'C422255 "New" option is not displayed in "Actions" menu when user doesn\'t have required permissions - Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C422255'] },
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
