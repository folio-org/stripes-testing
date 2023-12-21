import permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSearch from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

const testData = {};
const instance = BrowseContributors.defaultInstanceAWithContributor;

describe('Inventory › Contributors Browse', () => {
  before('Create inventory instance with contributor', () => {
    cy.getAdminToken().then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((res) => {
        instance.instanceTypeId = res[0].id;
      });

      BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
        instance.contributors[0].contributorNameTypeId = contributorNameTypes[0].id;
        instance.contributors[0].contributorNameType = contributorNameTypes[0].name;
        instance.contributors[0].contributorTypeText = contributorNameTypes[0].name;
      });

      BrowseContributors.createInstanceWithContributorViaApi(instance);

      cy.getInstanceById(instance.id).then((res) => {
        testData.instanceAProps = res;
      });

      cy.createTempUser([permissions.uiInventoryViewInstances.gui]).then((resUserProperties) => {
        testData.user = resUserProperties;
        cy.login(resUserProperties.username, resUserProperties.password);
        cy.visit(TopMenu.inventoryPath);
      });
    });
  });

  afterEach('Deleting user and instance', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    InventoryInstance.deleteInstanceViaApi(instance.id);
  });

  it(
    'C353653 Return back to "Browse inventory" pane via the web-browser "Back" button (exact match query)(Spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      InventorySearchAndFilter.selectBrowseContributors();
      BrowseContributors.browse(instance.contributors[0].name);
      InventorySearchAndFilter.showsOnlyNameTypeAccordion();
      BrowseSearch.checkValueIsBold(instance.contributors[0].name);
      BrowseContributors.checkSearchResultsTable();
      BrowseSearch.verifyBrowseInventoryPane();
      BrowseContributors.openInstance(instance.contributors[0]);
      InventoryInstances.checkSearchResultCount(/1 record found/);
      InventoryInstance.verifyInstanceTitle(instance.title);
      InventorySearchAndFilter.instanceTabIsDefault();
      BrowseSearch.verifyInventoryPane();
      BrowseContributors.checkActionsButton();
      InventorySearchAndFilter.switchToBrowseTab();
      BrowseContributors.checkActionsButton('absent');
      BrowseContributors.verifySearchTerm(instance.contributors[0].name);
    },
  );
});
