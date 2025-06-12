import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import MigrationData from '../../../support/migrationData';

describe('Permissions', () => {
  describe('Permissions --> Inventory', () => {
    const userData = {};
    const testData = {};
    before('create tests data', () => {
      testData.instanceTitle = `autoTestInstanceTitle ${getRandomPostfix()}`;
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
          });
        })
        .then((instance) => {
          testData.instanceId = instance.instanceId;
        });

      cy.then(() => {
        if (Cypress.env('migrationTest')) {
          Users.getUsers({
            limit: 500,
            query: `username="${MigrationData.getUsername('C375076')}"`,
          }).then((users) => {
            userData.username = users[0].username;
            userData.password = MigrationData.password;
          });
        } else {
          cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
            (userProperties) => {
              userData.username = userProperties.username;
              userData.password = userProperties.password;
              userData.userId = userProperties.userId;
            },
          );
        }
      }).then(() => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    });

    it(
      'C375076 User with "Inventory: View, create, edit instances" permission can see browse call numbers and subjects without assigning specific browse permissions (Orchid+) (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet'] },
      () => {
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifySearchAndFilterPaneBrowseToggle();
        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.verifySearchAndResetAllButtonsDisabled(true);
        InventorySearchAndFilter.browseSearch('K1');
        InventorySearchAndFilter.verifySearchAndResetAllButtonsDisabled(false);
        InventorySearchAndFilter.verifyBrowseInventorySearchResults();
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.verifySearchAndResetAllButtonsDisabled(true);
        InventorySearchAndFilter.browseSearch('art');
        InventorySearchAndFilter.verifySearchAndResetAllButtonsDisabled(false);
        InventorySearchAndFilter.verifyBrowseInventorySearchResults();
      },
    );
  });
});
