import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const testData = {
      instance: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
          InventoryInstance.createInstanceViaApi({
            contributors: [
              {
                name: `autotest_contributor_name_${randomFourDigitNumber()}`,
                contributorNameTypeId: contributorNameTypes[0].id,
                contributorTypeText: '',
                primary: false,
              },
            ],
          }).then(({ instanceData }) => {
            testData.instance = instanceData;
          });
        });
      });

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C357577 Verify that not-exact match placeholder displays fully in the "Contributor" column (spitfire) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        // Select "Browse", Click on the browse option dropdown and select “Contributors” option
        InventorySearchAndFilter.selectBrowseContributors();

        // Fill in the input field with the long not-existing contributor name, which will retrieve non-exact match result.
        // Click on the "Search" button.
        BrowseContributors.searchRecordByName(testData.instance.contributors[0].name);
        BrowseContributors.checkNonExactSearchResultForARow(testData.instance.contributors[0].name);
      },
    );
  });
});
