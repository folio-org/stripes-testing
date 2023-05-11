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
      name: 'Test, ContributorC353999',
      nameTypes: {
        personal: 'Personal name',
        corporate: 'Corporate name',
        meeting: 'Meeting name',
      },
      types: {
        actor: 'Actor',
        addressee: 'Addressee',
        adapter: 'Adapter',
      },
    }
  };

  before(() => {
    cy.createTempUser([
      Permissions.uiInventoryViewCreateEditInstances.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });

    InventoryInstances.createInstanceViaApi(testData.item.instanceName, testData.item.itemBarcode);
  });

  beforeEach(() => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventorySearchAndFilter.waitLoading });
  });

  after(() => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.itemBarcode);
  });

  it('C353999 Verify that the "Instance" record with same "Contributor name", but different "Name type"and "Relator terms" displayed as 2 rows. (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    InventorySearchAndFilter.searchInstanceByTitle(testData.item.instanceName);
    InventorySearchAndFilter.selectSearchResultItem();
    InventorySearchAndFilter.clickEditInstance();

    InstanceRecordEdit.clickAddContributor();
    InstanceRecordEdit.fillContributorData(0, testData.contributor.name, testData.contributor.nameTypes.personal, testData.contributor.types.actor);
    InstanceRecordEdit.clickAddContributor();
    InstanceRecordEdit.fillContributorData(1, testData.contributor.name, testData.contributor.nameTypes.corporate, testData.contributor.types.addressee);
    InstanceRecordEdit.clickAddContributor();
    InstanceRecordEdit.fillContributorData(2, testData.contributor.name, testData.contributor.nameTypes.meeting, testData.contributor.types.adapter);
    InstanceRecordEdit.saveAndClose();

    InventorySearchAndFilter.switchToBrowseTab();

    BrowseContributors.select();
    BrowseContributors.browse(testData.contributor.name);
    BrowseContributors.checkSearchResultRecord(testData.contributor.name);
    BrowseContributors.checkSearchResultRow(testData.contributor.name, testData.contributor.nameTypes.personal, testData.contributor.types.actor, '1');
    BrowseContributors.checkSearchResultRow(testData.contributor.name, testData.contributor.nameTypes.corporate, testData.contributor.types.addressee, '1');
    BrowseContributors.checkSearchResultRow(testData.contributor.name, testData.contributor.nameTypes.meeting, testData.contributor.types.adapter, '1');
  });
});
