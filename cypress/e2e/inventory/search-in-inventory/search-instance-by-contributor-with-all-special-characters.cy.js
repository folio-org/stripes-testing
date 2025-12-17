import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `C374131${randomFourDigitNumber()}`;
    const instanceTitlePrefix = `AT_C374131_FolioInstance_${randomPostfix}`;
    const keywordOption = searchInstancesOptions[0];
    const contributorsOption = searchInstancesOptions[1];

    const contributorNames = [
      `${randomDigits} extendettest476 ~ ! @ # % ^ & ( ) - _ + = { } [ ] / : ; " ' < > , . ? extendettest476 (contributors)`,
      `${randomDigits} ~ " Conference" ! on @ < Homeland; # Protection > ' % ( 2000 : U .S . Army / - War: _ College + Strategic = Studies Institute ? )`,
      `${randomDigits} Conference on Homeland Protection (2000 : U.S. Army War College Strategic Studies Institute)`,
    ];

    const searchTerms = [
      {
        value: `${randomDigits} extendettest476 ~ ! @ # % ^ & ( ) - _ + = { } [ ] / : ; " ' < > , . ? extendettest476 (contributors)`,
        expectedInstanceIndexes: [1],
      },
      {
        value: `${randomDigits} ~ " Conference" ! on @ < Homeland; # Protection > ' % ( 2000 : U .S . Army / - War: _ College + Strategic = Studies Institute ? )`,
        expectedInstanceIndexes: [2, 3],
      },
      {
        value: `${randomDigits} Conference on Homeland Protection (2000 : U.S. Army War College Strategic Studies Institute)`,
        expectedInstanceIndexes: [2, 3],
      },
    ];

    const instances = contributorNames.map((name, index) => ({
      title: `${instanceTitlePrefix}_${index + 1}`,
      contributorName: name,
    }));

    let instanceTypeId;
    let contributorNameTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C374131_FolioInstance');

      cy.then(() => {
        // Get required instance metadata
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        BrowseContributors.getContributorNameTypes({ searchParams: { limit: 1 } }).then(
          (nameTypes) => {
            contributorNameTypeId = nameTypes[0].id;
          },
        );
      }).then(() => {
        // Create all instances
        instances.forEach((instance) => {
          cy.createInstance({
            instance: {
              instanceTypeId,
              title: instance.title,
              contributors: [
                {
                  name: instance.contributorName,
                  contributorNameTypeId,
                  primary: false,
                },
              ],
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
      'C374131 Search for "Instance" by "Contributor name" field with all possible special characters using "Keyword" search option',
      { tags: ['extendedPath', 'spitfire', 'C374131'] },
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

        InventorySearchAndFilter.selectSearchOption(contributorsOption);

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
