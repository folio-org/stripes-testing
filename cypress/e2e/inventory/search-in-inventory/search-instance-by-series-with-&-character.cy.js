import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `C368022${randomFourDigitNumber()}`;
    const instanceTitlePrefix = `AT_C368022_FolioInstance_${randomPostfix}`;
    const keywordOption = searchInstancesOptions[0];

    const seriesStatements = [
      `${randomDigits} Chinese history & society ; v. 33`,
      `${randomDigits} Chinese history and society ; v. 33`,
      `${randomDigits} Chinese history society of civilization ; v. 33`,
    ];

    const searchTerms = [
      {
        value: `${randomDigits} Chinese history & society ; v. 33`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} Chinese history and society ; v. 33`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} Chinese history society ; v. 33`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} Chinese history of civilization ; v. 33`,
        expectedInstanceIndexes: [3],
      },
      {
        value: `${randomDigits} society history; v. 33`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} society & history; v. 33`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} society and history; v. 33`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} & Chinese history society ; v. 33`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} Chinese history society& ; v. 33`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} Chinese history&society ; v. 33`,
        expectedInstanceIndexes: [1, 2, 3],
      },
    ];

    const instances = seriesStatements.map((seriesStatement, index) => ({
      title: `${instanceTitlePrefix}_${index + 1}`,
      seriesStatement,
    }));

    let instanceTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C368022_FolioInstance');

      cy.then(() => {
        // Get required instance metadata
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
      }).then(() => {
        // Create all instances
        instances.forEach((instance) => {
          cy.createInstance({
            instance: {
              instanceTypeId,
              title: instance.title,
              series: [{ value: instance.seriesStatement }],
              languages: ['eng'],
            },
          }).then((instanceId) => {
            instance.id = instanceId;
          });
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventorySearchAndFilter.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instances.forEach((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C368022 Search for an Instance by the Series field containing the “&” character using the Keyword search option',
      { tags: ['extendedPath', 'spitfire', 'C368022'] },
      () => {
        // Ensure we're on the Instance tab with Keyword search selected
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordOption);

        searchTerms.forEach((term) => {
          if (term.expectedInstanceIndexes.length) {
            InventoryInstances.searchByTitle(term.value);
            InventorySearchAndFilter.checkRowsCount(term.expectedInstanceIndexes.length);
            term.expectedInstanceIndexes.forEach((index) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(`${instanceTitlePrefix}_${index}`);
            });
          } else {
            InventoryInstances.searchByTitle(term.value, false);
            InventorySearchAndFilter.verifyResultPaneEmpty();
          }
          InventorySearchAndFilter.clearSearchInputField();
          InventorySearchAndFilter.verifyResultPaneEmpty();
        });
      },
    );
  });
});
