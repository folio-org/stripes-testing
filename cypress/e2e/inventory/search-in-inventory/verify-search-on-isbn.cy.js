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
    const randomDigits = `${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const testData = {
      instanceTitlePrefix: `AT_C2321_FolioInstance_${randomPostfix}`,
      user: {},
      searchOption: searchInstancesOptions[5], // ISBN
      isbnNumbers: [
        `978-2321-${randomDigits}-0`,
        `9782321${randomDigits}1`,
        `978-2321-${randomDigits}-2`,
        `1${randomDigits}Y`,
        `978-2321-${randomDigits}INV-4`,
        `09782321${randomDigits}INV5`,
        `978-2321-${randomDigits}INV-6`,
      ],
    };
    const instanceIds = [];
    let instanceTypeId;
    let isbnTypeId;
    let invalidIsbnTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C2321_FolioInstance');
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getIdentifierTypes({ query: 'name=="ISBN"' }).then((identifier) => {
          isbnTypeId = identifier.id;
        });
        InventoryInstances.getIdentifierTypes({ query: 'name=="Invalid ISBN"' }).then(
          (identifier) => {
            invalidIsbnTypeId = identifier.id;
          },
        );
      }).then(() => {
        // Create instances with different ISBN values
        testData.isbnNumbers.forEach((isbnNumber, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: `${testData.instanceTitlePrefix}_${index}`,
              identifiers: [
                {
                  value: isbnNumber,
                  identifierTypeId: isbnNumber.includes('INV') ? invalidIsbnTypeId : isbnTypeId,
                },
              ],
            },
          }).then((instanceData) => {
            instanceIds.push(instanceData.instanceId);
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
      'C2321 Search: Verify search on ISBN (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C2321'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();

        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);

        testData.isbnNumbers.forEach((isbnNumber, index) => {
          if (!index) InventoryInstances.searchByTitle(isbnNumber);
          else {
            InventorySearchAndFilter.searchByParameter(testData.searchOption, isbnNumber);
          }
          InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_${index}`);
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        });
      },
    );
  });
});
