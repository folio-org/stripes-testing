import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitlePrefix: `AT_C2319_FolioInstance_${randomPostfix}`,
      user: {},
      searchOption: searchInstancesOptions[2], // Title (all)
      titleVariations: [
        { type: 'indexTitle', value: `AT_C2319_IndexTitle_${randomPostfix}` },
        { type: 'alternativeTitle', value: `AT_C2319_AlternativeTitle_${randomPostfix}_000` },
        { type: 'alternativeTitle', value: `AT_C2319_AlternativeTitle_${randomPostfix}_001` },
        { type: 'alternativeTitle', value: `AT_C2319_AlternativeTitle_${randomPostfix}_002` },
        { type: 'seriesStatement', value: `AT_C2319_SeriesStatement_${randomPostfix}` },
      ],
    };
    const instanceIds = [];
    let instanceTypeId;
    let alternativeTitleTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C2319_FolioInstance');
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });

        // Get first available alternative title type
        cy.getAlternativeTitlesTypes({ limit: 1, query: 'source=folio' }).then((titleTypes) => {
          alternativeTitleTypeId = titleTypes[0].id;
        });
      }).then(() => {
        // Create instances with different title variations
        testData.titleVariations.forEach((titleVar, index) => {
          const instanceData = {
            instanceTypeId,
            title: `${testData.instanceTitlePrefix}_${index}`,
          };

          // Add specific title variations based on type
          if (titleVar.type === 'indexTitle') {
            instanceData.indexTitle = titleVar.value;
          } else if (titleVar.type === 'alternativeTitle') {
            instanceData.alternativeTitles = [
              {
                alternativeTitleTypeId,
                alternativeTitle: titleVar.value,
              },
            ];
          } else if (titleVar.type === 'seriesStatement') {
            instanceData.series = [{ value: titleVar.value }];
          }

          InventoryInstances.createFolioInstanceViaApi({
            instance: instanceData,
          }).then((instanceResponse) => {
            instanceIds.push(instanceResponse.instanceId);
          });
        });

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          testData.user = userProperties;
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C2319 Search: Verify search on Title (All) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C2319'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
        }, 20_000);
        InventoryInstances.waitContentLoading();

        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();

        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);

        InventoryInstances.searchByTitle(`${testData.instanceTitlePrefix}_3`);
        InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_3`);
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();

        testData.titleVariations.forEach((titleVar, index) => {
          InventorySearchAndFilter.searchByParameter(testData.searchOption, titleVar.value);
          InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_${index}`);
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        });
      },
    );
  });
});
