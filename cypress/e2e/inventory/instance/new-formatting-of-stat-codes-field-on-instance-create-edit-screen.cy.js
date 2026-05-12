import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `AT_C400652_Instance_${getRandomPostfix()}`,
      statisticalCode: 'Book, print (books)',
      filterValue: 'ARL',
    };

    before('Create test user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      });
    });

    it(
      'C400652 Check the new formatting of Statistical codes field on Instance create/edit screen (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C400652'] },
      () => {
        // Step 1: Go to Inventory -> Actions -> New
        const newInstance = InventoryInstances.addNewInventory();

        // Step 2: Click "Add statistical code" -> "Select code" dropdown appears
        newInstance.clickAddStatisticalCodeButton();

        // Step 3: Open dropdown -> "Filter options list" + all codes present
        newInstance.openStatisticalCodeDropdown();
        newInstance.verifyStatisticalCodeDropdown();

        // Step 4: Filter by value -> list updated accordingly
        newInstance.filterStatisticalCodeByName(testData.filterValue);
        newInstance.verifyStatisticalCodeListOptionsFilteredBy(testData.filterValue);

        // Step 5: Select a value -> shown in dropdown, no error
        newInstance.chooseStatisticalCode(testData.statisticalCode);
        newInstance.checkErrorMessageForStatisticalCode(false);

        // Steps 6-8: Fill required fields and save
        newInstance.fillRequiredValues(testData.instanceTitle);
        newInstance.clickSaveAndCloseButton();

        // Step 9: Click Actions -> Edit instance
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();

        // Step 10: Repeat steps 3-5 on the edit screen
        InstanceRecordEdit.openStatisticalCodeDropdown();
        InstanceRecordEdit.verifyStatisticalCodeDropdown();

        InstanceRecordEdit.filterStatisticalCodeByName(testData.filterValue);
        InstanceRecordEdit.verifyStatisticalCodeListOptionsFilteredBy(testData.filterValue);

        InstanceRecordEdit.chooseStatisticalCode(testData.statisticalCode);
        InstanceRecordEdit.checkErrorMessageForStatisticalCode(false);
      },
    );
  });
});
