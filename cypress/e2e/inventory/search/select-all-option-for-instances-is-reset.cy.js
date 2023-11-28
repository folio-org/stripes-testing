import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Search In Inventory', () => {
    const testData = {
      instanceTitle: `C366119 autoTestInstanceTitle${getRandomPostfix()}`,
      barcode: uuid(),
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.createInstanceViaApi(testData.instanceTitle, testData.barcode);
      });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.dataExportEnableApp.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
      });
    });

    it(
      'C366119 Verify select all option for quick instances export is reset (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        InventorySearchAndFilter.byKeywords();
        InventoryInstances.clickSelectAllInstancesCheckbox();
        InventoryInstances.verifyInventoryLabelText('records found');
        InventoryInstances.verifyInventoryLabelText('records selected');
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventoryInstances.verifyInventoryLabelText('Enter search criteria to start search');
        InventorySearchAndFilter.byKeywords();
        InventoryInstances.verifyAllCheckboxesAreUnchecked();
        InventoryInstances.verifyInventoryLabelText('records found');
      },
    );
  });
});
