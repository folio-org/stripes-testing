import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `C399088 autoTestInstanceTitle${getRandomPostfix()}`,
      barcode: uuid(),
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.createInstanceViaApi(testData.instanceTitle, testData.barcode);
      });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiRequestsCreate.gui]).then(
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
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C399088 Verify the option for the creating requests on Instance detail page (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyViewRequestOptionEnabled();
      },
    );
  });
});
