import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC -> MARC Authority', () => {
  const testData = {};

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiInventoryViewCreateEditInstances.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.exportManagerAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after('Deleting user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C375134 User with "Export manager: All" permission can view report options for "MARC authority" records (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      MarcAuthorities.clickActionsAndReportsButtons();
    },
  );
});
