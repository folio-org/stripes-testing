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
      statisticalCode1: 'ARL (Collection stats):    books - Book, print (books)',
      statisticalCode2: 'ARL (Collection stats):    ebooks - Books, electronic (ebooks)',
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
        const NewInstance = InventoryInstances.addNewInventory();

        // Step 2: Click "Add statistical code" -> "Select code" dropdown appears
        NewInstance.clickAddStatisticalCodeButton();

        // Step 3: Open "Select code" dropdown -> "Filter options list" + all codes present
        NewInstance.openStatisticalCodeDropdown();
        NewInstance.verifyStatisticalCodeDropdown();

        // Step 4: Filter by value -> list updated accordingly
        NewInstance.filterStatisticalCodeByName(testData.filterValue);
        NewInstance.verifyStatisticalCodeListOptionsFilteredBy(testData.filterValue);

        // Step 5: Select a value -> shown in dropdown, no error
        NewInstance.filterStatisticalCodeByName(testData.filterValue);
        NewInstance.selectStatisticalCode(testData.statisticalCode1);
        NewInstance.checkErrorMessageForStatisticalCode(false);

        // Steps 6-7: Fill required fields
        NewInstance.fillRequiredValues(testData.instanceTitle);

        // Step 8: Save & close
        NewInstance.clickSaveAndCloseButton();

        // Step 9: Actions -> Edit instance
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();

        // Step 10: Repeat steps 3-5 on edit screen
        NewInstance.clickAddStatisticalCodeButton();
        InstanceRecordEdit.openStatisticalCodeDropdown(1);
        InstanceRecordEdit.verifyStatisticalCodeDropdown();
        InstanceRecordEdit.filterStatisticalCodeByName(testData.filterValue);
        InstanceRecordEdit.verifyStatisticalCodeListOptionsFilteredBy(testData.filterValue);

        InstanceRecordEdit.chooseStatisticalCode(testData.statisticalCode2);
        InstanceRecordEdit.checkErrorMessageForStatisticalCode(false);
      },
    );
  });
});
