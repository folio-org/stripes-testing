import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Permisions -> Inventory', () => {
  let userId;
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

    cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
      (userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      },
    );
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userId);
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
      InventorySearchAndFilter.verifySerachAndResetAllButtonsDisabled(true);
      InventorySearchAndFilter.browseSearch('K1');
      InventorySearchAndFilter.verifySerachAndResetAllButtonsDisabled(false);
      InventorySearchAndFilter.verifyBrowseInventorySearchResults();

      InventorySearchAndFilter.selectBrowseSubjects();
      InventorySearchAndFilter.verifySerachAndResetAllButtonsDisabled(true);
      InventorySearchAndFilter.browseSearch('art');
      InventorySearchAndFilter.verifySerachAndResetAllButtonsDisabled(false);
      InventorySearchAndFilter.verifyBrowseInventorySearchResults();
    },
  );
});
