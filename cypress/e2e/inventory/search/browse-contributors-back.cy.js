import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Inventory -> Contributors Browse', () => {
  const testData = {
    item: {
      instanceName: `testContributorsBrowse_${getRandomPostfix()}`,
      itemBarcode: getRandomPostfix(),
    },

    contributor: {
      precedingNamesPrefix: 'ATest_Contributor_',
      namePrefix: 'BTest_Contributor_',
      name: `BTest_Contributor_${getRandomPostfix()}`,
      nameTypes: {
        personal: 'Personal name',
      },
      types: {
        actor: 'Actor',
      },
    },
  };

  before(() => {
    cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
      (createdUserProperties) => {
        testData.userProperties = createdUserProperties;
      },
    );
  });

  beforeEach(() => {
    InventoryInstances.createInstanceViaApi(testData.item.instanceName, testData.item.itemBarcode);
    cy.loginAsAdmin({
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
    });
    InventorySearchAndFilter.searchInstanceByTitle(testData.item.instanceName);
    InventorySearchAndFilter.selectSearchResultItem();
    InventorySearchAndFilter.clickEditInstance();
    for (let i = 0; i < 5; i++) {
      InstanceRecordEdit.clickAddContributor();
      InstanceRecordEdit.fillContributorData(
        i,
        `${testData.contributor.precedingNamesPrefix}${i}`,
        testData.contributor.nameTypes.personal,
        testData.contributor.types.actor,
      );
    }
    InstanceRecordEdit.clickAddContributor();
    InstanceRecordEdit.fillContributorData(
      5,
      testData.contributor.name,
      testData.contributor.nameTypes.personal,
      testData.contributor.types.actor,
    );
    InstanceRecordEdit.saveAndClose();
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
    });
  });

  after(() => {
    Users.deleteViaApi(testData.userProperties.userId);
  });

  afterEach(() => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.itemBarcode);
  });

  it(
    'C357032 Return back to "Browse inventory" pane via the web-browser "Back" button (not-exact match query) (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstances.waitContentLoading();
      InventorySearchAndFilter.switchToBrowseTab();
      BrowseContributors.select();
      BrowseContributors.browse(testData.contributor.namePrefix);
      BrowseContributors.checkNonExactSearchResultForARow(testData.contributor.namePrefix);
      BrowseContributors.openRecord(testData.contributor.name);
      InventorySearchAndFilter.verifyInstanceDetailsView();
      InventorySearchAndFilter.checkSearchQueryText(testData.contributor.name);
      InventoryInstances.verifyInventorySearchPaneheader();
      InventoryInstances.checkActionsButtonInSecondPane();
      InventorySearchAndFilter.switchToBrowseTab();
      BrowseContributors.checkBrowseQueryText(testData.contributor.namePrefix);
      BrowseContributors.checkNonExactSearchResultForARow(testData.contributor.namePrefix);
      BrowseContributors.verifyInventoryBrowsePaneheader();
      BrowseContributors.checkActionsButton('absent');
    },
  );
});
