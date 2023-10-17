import testType from '../../../support/dictionary/testTypes';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import devTeams from '../../../support/dictionary/devTeams';

describe('Inventory: Contributors Browse', () => {
  let instances = [];
  let contributors = [];
  const currentUser = {};

  before('Create test data', () => {
    instances = BrowseContributors.createInstancesWithContributor();
    BrowseContributors.getContributorNameTypes({ searchParams: { limit: 3 } }).then((response) => {
      contributors = response.body.contributorNameTypes.map(({ name }) => name);
    });

    cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
      ({ userId, username, password }) => {
        currentUser.userId = userId;

        cy.login(username, password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    Users.deleteViaApi(currentUser.userId);
    instances.forEach((instance) => InventoryInstance.deleteInstanceViaApi(instance.id));
  });

  it(
    'C353644 Apply "Name Type" filter to the browse result list (spitfire) (TaaS)',
    { tags: [testType.criticalPath, devTeams.spitfire] },
    () => {
      BrowseContributors.clickBrowseBtn();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      InventorySearchAndFilter.verifyBrowseOptions();

      BrowseContributors.selectContributorsOption();
      BrowseContributors.checkSearch();

      BrowseContributors.searchRecordByName(instances[0].contributors[0].name);
      BrowseContributors.checkSearchResultsTable();
      BrowseContributors.checkSearchResultRecord(instances[0].contributors[0].name);

      BrowseContributors.expandNameTypeSection();
      BrowseContributors.expandNameTypeMenu();
      BrowseContributors.selectNameTypeOption(contributors[2]);
      BrowseContributors.checkMissedMatchSearchResultRecord(instances[0].contributors[0].name);

      BrowseContributors.selectNameTypeOption(contributors[1]);
      BrowseContributors.checkMissedMatchSearchResultRecord(instances[0].contributors[0].name);

      BrowseContributors.typeNameTypeOption(contributors[0]);
      BrowseContributors.checkSearchResultRecord(instances[0].contributors[0].name);

      BrowseContributors.unselectNameTypeOption(contributors[0]);
      BrowseContributors.checkMissedMatchSearchResultRecord(instances[0].contributors[0].name);

      BrowseContributors.removeNameTypeOption(contributors[1]);
      BrowseContributors.checkMissedMatchSearchResultRecord(instances[0].contributors[0].name);

      BrowseContributors.clearNameTypeOptions();
      BrowseContributors.checkSearchResultRecord(instances[0].contributors[0].name);
    },
  );
});
