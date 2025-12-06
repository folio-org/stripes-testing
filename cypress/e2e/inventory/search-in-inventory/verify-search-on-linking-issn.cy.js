import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomFourDigitNumber();
    const testData = {
      instanceTitle: `AT_C353613_FolioInstance_${randomPostfix}`,
      user: {},
      searchOption: searchInstancesOptions[6], // ISSN
      issnNumber: `353613-${randomDigits}${randomDigits}-1`,
      dropdownOption: 'Linking ISSN',
    };
    const folioInstances = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix: testData.instanceTitle,
      count: 1,
      holdingsCount: 0,
      itemsCount: 0,
    });
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C353613');

      InventoryInstances.createFolioInstancesViaApi({
        folioInstances,
      });
      instanceId = folioInstances[0].instanceId;

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C353613 Search: Verify search on linking ISSN (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C353613'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InstanceRecordView.edit();
        InstanceRecordEdit.addIdentifier(testData.dropdownOption, testData.issnNumber);
        InstanceRecordView.verifySuccsessCalloutMessage();
        InventoryInstance.waitLoading();

        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();

        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);

        InventoryInstances.searchByTitle(testData.issnNumber);
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      },
    );
  });
});
