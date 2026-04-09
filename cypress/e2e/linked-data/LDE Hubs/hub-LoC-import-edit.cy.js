import TopMenu from '../../../support/fragments/topMenu';
import Marigold from '../../../support/fragments/linked-data/marigold';
import { LDE_ROLES } from '../../../support/constants';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import HubSearchResults from '../../../support/fragments/linked-data/hubSearchResults';
import EditHubPage from '../../../support/fragments/linked-data/editHubPage';
import PreviewHubPage from '../../../support/fragments/linked-data/previewHubPage';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];

describe('MG Hubs: Import and edit LoC hub', () => {
  const testData = {
    roleIds: [],
    // Test hub data - will search for existing LoC hub
    searchQuery: 'Netscape Conference',
    primarySource: 'Library of Congress',
    importedSource: 'Library of Congress, Local',
    variantTitles: ['Conference', 'Netscape Communicator. Netscape Conference'],
    hubId: null,
  };

  before('Create test user', () => {
    cy.getAdminToken();

    roleNames.forEach((roleName) => {
      cy.getUserRoleIdByNameApi(roleName).then((roleId) => {
        if (roleId) {
          testData.roleIds.push(roleId);
        }
      });
    });

    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });

    cy.then(() => {
      if (testData.roleIds.length > 0) {
        cy.updateRolesForUserApi(user.userId, testData.roleIds);
      }
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (testData.hubId) {
      EditHubPage.deleteViaAPI(testData.hubId);
    }
    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.linkedDataEditor,
      waiter: Marigold.waitLoading,
      authRefresh: true,
    });
  });

  it(
    'C1030061 Import and edit LoC hub (citation)',
    { tags: ['C1030061', 'criticalPath', 'citation', 'shiftLeft'] },
    () => {
      // Switch to Hubs tab
      SearchAndFilter.switchToHubsTab();
      SearchAndFilter.verifyActiveButtons(false);
      HubSearchResults.verifyNumberOfFoundRecords(0);
      SearchAndFilter.verifyLoCSourceOptionIsSelected();

      // Search for LoC hub to edit
      cy.getAdminToken();
      SearchAndFilter.searchResourceByTitle(testData.searchQuery);
      HubSearchResults.verifyNumberOfFoundRecords(1);
      HubSearchResults.verifyLoCSearchResultsByTitle({
        title: testData.searchQuery,
        source: testData.primarySource,
        actionButton: 'Import/Edit',
      });

      // Click Import/Edit to open hub preview
      HubSearchResults.clickImportEditButton();
      PreviewHubPage.waitLoading();
      PreviewHubPage.verifyPageTitle(testData.searchQuery);
      PreviewHubPage.verifyButtons();
      PreviewHubPage.verifySectionsPresent();
      PreviewHubPage.verifyTitleInformation({
        mainTitle: testData.searchQuery,
        variantTitles: testData.variantTitles,
      });

      // Cancel preview and verify hub is not imported
      PreviewHubPage.clickCancel();
      HubSearchResults.verifyLoCSearchResultsByTitle({
        title: testData.searchQuery,
        source: testData.primarySource,
        actionButton: 'Import/Edit',
      });

      // Close preview and verify hub is not imported
      HubSearchResults.clickImportEditButton();
      PreviewHubPage.waitLoading();
      PreviewHubPage.clickClose();
      SearchAndFilter.switchToHubsTab();

      HubSearchResults.verifyLoCSearchResultsByTitle({
        title: testData.searchQuery,
        source: testData.primarySource,
        actionButton: 'Import/Edit',
      });

      // Import hub: click Import/Edit again, then Continue
      HubSearchResults.clickImportEditButton();
      PreviewHubPage.waitLoading();
      PreviewHubPage.clickContinue();
      EditHubPage.waitLoading().then((id) => {
        testData.hubId = id;
      });

      // Verify edit page buttons state
      EditHubPage.verifyButtons();

      // Verify imported hub title sections
      EditHubPage.verifyAllTitleSections([
        { type: 'http://bibfra.me/vocab/library/VariantTitle', title: testData.variantTitles[0] },
        { type: 'http://bibfra.me/vocab/library/VariantTitle', title: testData.variantTitles[1] },
        { type: 'http://bibfra.me/vocab/library/Title', title: testData.searchQuery },
      ]);
      EditHubPage.clickCancel();

      // Verify imported hub in the search results
      SearchAndFilter.selectSourceLocalOption();
      SearchAndFilter.searchResourceByTitle(`${testData.searchQuery}`);
      HubSearchResults.verifyLoCSearchResultsByTitle({
        title: testData.searchQuery,
        source: testData.importedSource,
        actionButton: 'Edit',
      });
    },
  );
});
