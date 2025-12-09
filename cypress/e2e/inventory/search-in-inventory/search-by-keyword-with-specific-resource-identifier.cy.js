import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `367976${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const testData = {
      instanceTitle: `AT_C367976_FolioInstance_${randomPostfix}`,
      user: {},
      identifierTypeName: 'ISBN',
      searchOptions: {
        keyword: searchInstancesOptions[0],
        identifierAll: searchInstancesOptions[3],
      },
      identifierValue: `.b${randomDigits}`,
    };
    const instanceIds = [];
    let instanceTypeId;
    let identifierTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C367976');
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getIdentifierTypes({
          query: `name="${testData.identifierTypeName}"`,
        }).then((identifierType) => {
          identifierTypeId = identifierType.id;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId,
            title: testData.instanceTitle,
            identifiers: [
              {
                value: testData.identifierValue,
                identifierTypeId,
              },
            ],
          },
        }).then((instanceData) => {
          instanceIds.push(instanceData.instanceId);

          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.instanceTabIsDefault();
            InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
              testData.searchOptions.keyword,
            );
          });
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
      'C367976 Verify that search by "Keyword" will find records with specific string type (e.g.: ".b1234") in "Resource identifier" field (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C367976'] },
      () => {
        InventorySearchAndFilter.fillInSearchQuery(testData.identifierValue);
        InventorySearchAndFilter.checkSearchQueryText(testData.identifierValue);
        InventorySearchAndFilter.checkSearchButtonEnabled();

        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.verifySearchButtonDisabled();

        InventorySearchAndFilter.selectSearchOption(testData.searchOptions.identifierAll);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
          testData.searchOptions.identifierAll,
        );

        InventorySearchAndFilter.fillInSearchQuery(testData.identifierValue);
        InventorySearchAndFilter.checkSearchQueryText(testData.identifierValue);
        InventorySearchAndFilter.checkSearchButtonEnabled();

        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstance.waitLoading();
        InventoryInstance.verifyResourceIdentifier(
          testData.identifierTypeName,
          testData.identifierValue,
          0,
        );
      },
    );
  });
});
