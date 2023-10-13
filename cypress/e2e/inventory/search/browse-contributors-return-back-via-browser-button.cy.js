import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSearch from '../../../support/fragments/inventory/search/browseSubjects';

const testData = {};
const instance = BrowseContributors.defaultInstanceAWithContributor;

describe('Inventory › Contributors Browse', () => {
  before('Create inventory instance with contributor', () => {
    cy.getAdminToken().then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((res) => {
        instance.instanceTypeId = res[0].id;
      });

      BrowseContributors.getContributorNameTypes().then((res) => {
        instance.contributors[0].contributorNameTypeId = res.body.contributorNameTypes[0].id;
        instance.contributors[0].contributorNameType = res.body.contributorNameTypes[0].name;
        instance.contributors[0].contributorTypeText = res.body.contributorNameTypes[0].name;
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
    Users.deleteViaApi(testData.user.userId);
    InventoryInstance.deleteInstanceViaApi(instance.id);
  });

  it(
    'C353653 Return back to "Browse inventory" pane via the web-browser "Back" button (exact match query)(Spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
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
      BrowseContributors.checkSearchResultCount('1 record found');
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
