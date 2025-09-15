import { Permissions } from '../../../support/dictionary';
import FastAddNewRecord from '../../../support/fragments/inventory/fastAddNewRecord';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Fast Add', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C422095_FolioInstance_${randomPostfix}`;
    let user;

    before('Create test user and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C422095_FolioInstance');
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        // create a few records to search for
        const instanceData = InventoryInstances.generateFolioInstances({
          count: 3,
          instanceTitlePrefix,
          holdingsCount: 0,
        });
        instanceData.forEach((instance, index) => {
          instance.instanceTitle = `${instanceTitlePrefix}_${index + 1}`;
        });
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: instanceData,
        });

        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C422095 Click on "X" button in "New fast add record" pane (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422095'] },
      () => {
        InventoryActions.openNewFastAddRecordForm();
        FastAddNewRecord.waitLoading();
        FastAddNewRecord.closePane();
        InventorySearchAndFilter.verifyInstanceDetailsViewAbsent();

        InventoryInstances.searchByTitle(`${instanceTitlePrefix}_1`);
        InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_1`);
        InventoryInstance.verifyInstanceTitle(`${instanceTitlePrefix}_1`);

        InventoryActions.openNewFastAddRecordForm();
        FastAddNewRecord.waitLoading();
        FastAddNewRecord.closePane();
        InventoryInstance.verifyInstanceTitle(`${instanceTitlePrefix}_1`);

        InventoryInstances.searchByTitle(instanceTitlePrefix);
        for (let i = 1; i <= 3; i++) {
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${i}`);
        }

        InventoryActions.openNewFastAddRecordForm();
        FastAddNewRecord.waitLoading();
        FastAddNewRecord.closePane();
        InventorySearchAndFilter.verifyInstanceDetailsViewAbsent();
        for (let i = 1; i <= 3; i++) {
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${i}`);
        }
      },
    );
  });
});
