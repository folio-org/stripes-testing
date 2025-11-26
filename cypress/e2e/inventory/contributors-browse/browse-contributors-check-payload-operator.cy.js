import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C358966_FolioInstance_${randomPostfix}`,
      searchOption: searchInstancesOptions[1],
      contributorValue: `AT_C358966_Contributor_${randomPostfix}`,
    };
    let instanceId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C358966');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: testData.instanceTitle,
                contributors: [
                  {
                    name: testData.contributorValue,
                    contributorNameTypeId: contributorNameTypes[0].id,
                    contributorTypeText: '',
                    primary: false,
                  },
                ],
              },
            }).then((instanceData) => {
              instanceId = instanceData.instanceId;
            });
          });
        });
      }).then(() => {
        cy.createTempUser([
          Permissions.uiInventoryViewCreateEditInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C358966 Verify that operator "==/string" is used when user clicks on the "Contributor name" at the browse result list (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C358966'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        BrowseContributors.select();
        BrowseContributors.expandNameTypeSection();

        BrowseContributors.waitForContributorToAppear(testData.contributorValue);

        InventorySearchAndFilter.fillInBrowseSearch(testData.contributorValue);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(testData.contributorValue);
        InventorySearchAndFilter.verifySearchButtonDisabled(false);
        InventorySearchAndFilter.clickSearch();
        BrowseContributors.checkSearchResultRecord(testData.contributorValue);
        BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
          testData.contributorValue,
          1,
        );

        cy.intercept('GET', '/search/instances*').as('getInstances');
        BrowseSubjects.selectRecordByTitle(testData.contributorValue);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        InventoryInstance.checkContributor(testData.contributorValue);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);
        InventorySearchAndFilter.checkSearchQueryText(testData.contributorValue);
        cy.wait('@getInstances').then(({ request }) => {
          const url = new URL(request.url);
          const query = decodeURIComponent(url.searchParams.get('query'));
          expect(query).to.include(`contributors.name==/string "${testData.contributorValue}"`);
        });
      },
    );
  });
});
