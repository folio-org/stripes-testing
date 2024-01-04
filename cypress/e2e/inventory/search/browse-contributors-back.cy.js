import Permissions from '../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

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
    cy.getInstanceTypes({ limit: 2 }).then((instanceTypes) => {
      InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId: instanceTypes[0].id,
          title: testData.item.instanceName,
        },
      }).then((instanceIds) => {
        testData.instanceId = instanceIds.instanceId;
      });
    });

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
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
  });

  afterEach(() => {
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(testData.instanceId);
  });

  it(
    'C357032 Return back to "Browse inventory" pane via the web-browser "Back" button (not-exact match query) (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
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
