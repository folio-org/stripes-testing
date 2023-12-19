import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory -> Call Number and Subjects Browse', () => {
  let userId;
  const testData = {};
  beforeEach('create tests data', () => {
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

  afterEach('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userId);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
  });

  it(
    'C375076 User with "Inventory: View, create, edit instances" permission can see browse call numbers and subjects without assigning specific browse permissions (Orchid+) (thunderjet) (TaaS)',
    { tags: ['extended', 'thunderjet'] },
    () => {
      InventorySearchAndFilter.verifySearchAndFilterPane();
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifySearchAndFilterPaneBrowseToggle();
      InventorySearchAndFilter.selectBrowseCallNumbers();
      InventorySearchAndFilter.verifyButtonsDisabled(true);
      InventorySearchAndFilter.browseSearch('K1');
      InventorySearchAndFilter.verifyButtonsDisabled(false);
      InventorySearchAndFilter.verifyBrowseInventorySearchResults();

      InventorySearchAndFilter.selectBrowseSubjects();
      InventorySearchAndFilter.verifyButtonsDisabled(true);
      InventorySearchAndFilter.browseSearch('art');
      InventorySearchAndFilter.verifyButtonsDisabled(false);
      InventorySearchAndFilter.verifyBrowseInventorySearchResults();
    },
  );
});
