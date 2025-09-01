import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomFourDigitNumber();
    const instanceTitlePrefix = `AT_C360552_FolioInstance_${randomPostfix}`;
    const issnNumbers = [
      `${randomDigits}360552-${randomDigits}0088`,
      `${randomDigits}360552-${randomDigits}0850`,
    ];

    const instanceIds = [];
    let instanceTypeId;
    let issnTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getIdentifierTypes({ query: 'name="ISSN"' }).then((identifier) => {
          issnTypeId = identifier.id;
        });
      }).then(() => {
        for (let index = 0; index < 3; index++) {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: `${instanceTitlePrefix}_${index}`,
              identifiers: [
                {
                  value: issnNumbers[0],
                  identifierTypeId: issnTypeId,
                },
              ],
            },
          }).then((instance) => {
            instanceIds.push(instance.instanceId);
          });
        }

        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId,
            title: `${instanceTitlePrefix}_3`,
            identifiers: [
              {
                value: issnNumbers[1],
                identifierTypeId: issnTypeId,
              },
            ],
          },
        }).then((instance) => {
          instanceIds.push(instance.instanceId);
        });

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
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
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C360552 Displaying detail view pane automatically when search return 1 record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C360552'] },
      () => {
        InventoryInstances.searchByTitle(issnNumbers[0]);
        InventorySearchAndFilter.checkRowsCount(3);
        for (let index = 0; index < 3; index++) {
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
        }
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceIdentifier(issnNumbers[0]);
        InventorySearchAndFilter.closeInstanceDetailPane();

        InventorySearchAndFilter.clearSearchInputField();
        InventorySearchAndFilter.verifyResultPaneEmpty();

        InventoryInstances.searchByTitle(issnNumbers[1]);
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_3`);
        InventoryInstance.verifyInstanceTitle(`${instanceTitlePrefix}_3`);
        InventoryInstance.checkInstanceIdentifier(issnNumbers[1]);
      },
    );
  });
});
