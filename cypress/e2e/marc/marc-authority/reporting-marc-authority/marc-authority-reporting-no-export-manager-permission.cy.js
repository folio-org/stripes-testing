import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting', () => {
      let userData;

      before('Create user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateInstances.gui,
          Permissions.uiInventoryViewCreateEditInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          userData = userProperties;
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C375136 User without "Export manager" permissions cannot view report options for "MARC authority" records (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C375136'] },
        () => {
          // Step 1: Login and navigate to MARC Authority app
          cy.login(userData.username, userData.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });

          // Step 2: Click Actions → verify "MARC authority headings updates (CSV)" is absent
          MarcAuthorities.verifyHeadingsUpdatesButtonAbsent();
          MarcAuthorities.verifyReportsSectionShownInActionsMenu(false);
        },
      );
    });
  });
});
