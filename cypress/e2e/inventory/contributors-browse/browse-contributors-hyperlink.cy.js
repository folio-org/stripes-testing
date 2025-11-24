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
      instanceTitlePrefix: `AT_C374702_FolioInstance_${randomPostfix}`,
      searchOption: searchInstancesOptions[1],
      contributorPrefix: `AT_C374702_Contributor_${randomPostfix}`,
    };
    const instanceTitles = [
      `${testData.instanceTitlePrefix} A`,
      `${testData.instanceTitlePrefix} B`,
    ];
    const contributors = [
      `${testData.contributorPrefix} One Contributor`,
      `${testData.contributorPrefix} Both Contributor`,
    ];
    const instanceIds = [];
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C374702');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: instanceTitles[0],
                contributors: [
                  {
                    name: contributors[0],
                    contributorNameTypeId: contributorNameTypes[0].id,
                    contributorTypeText: '',
                    primary: false,
                  },
                  {
                    name: contributors[1],
                    contributorNameTypeId: contributorNameTypes[0].id,
                    contributorTypeText: '',
                    primary: false,
                  },
                ],
              },
            }).then((instanceData) => {
              instanceIds.push(instanceData.instanceId);
            });
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: instanceTitles[1],
                contributors: [
                  {
                    name: contributors[1],
                    contributorNameTypeId: contributorNameTypes[0].id,
                    contributorTypeText: '',
                    primary: false,
                  },
                ],
              },
            }).then((instanceData) => {
              instanceIds.push(instanceData.instanceId);
            });
          });
        });
      }).then(() => {
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C374702 Value in "Contributor" column is a hyperlink (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C374702'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        BrowseContributors.select();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');
        InventorySearchAndFilter.verifySearchButtonDisabled();
        InventorySearchAndFilter.verifyResetAllButtonDisabled();

        contributors.forEach((contributor) => {
          BrowseContributors.waitForContributorToAppear(contributor);
        });
        InventorySearchAndFilter.fillInBrowseSearch(testData.contributorPrefix);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(testData.contributorPrefix);
        InventorySearchAndFilter.verifySearchButtonDisabled(false);
        InventorySearchAndFilter.verifyResetAllButtonDisabled(false);
        InventorySearchAndFilter.clickSearch();
        BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(contributors[0], 1);
        InventorySearchAndFilter.verifyEveryRowContainsLinkButtonInBrowse();

        cy.intercept('GET', '/search/instances*').as('getInstances1');
        BrowseSubjects.selectRecordByTitle(contributors[0]);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);
        InventorySearchAndFilter.checkSearchQueryText(contributors[0]);
        cy.wait('@getInstances1').then(({ request }) => {
          const url = new URL(request.url);
          const query = decodeURIComponent(url.searchParams.get('query'));
          expect(query).to.include('==/string');
        });

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(contributors[1], 2);

        cy.intercept('GET', '/search/instances*').as('getInstances2');
        BrowseSubjects.selectRecordByTitle(contributors[1]);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(2);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);
        InventorySearchAndFilter.checkSearchQueryText(contributors[1]);
        cy.wait('@getInstances2').then(({ request }) => {
          const url = new URL(request.url);
          const query = decodeURIComponent(url.searchParams.get('query'));
          expect(query).to.include('==/string');
        });
      },
    );
  });
});
