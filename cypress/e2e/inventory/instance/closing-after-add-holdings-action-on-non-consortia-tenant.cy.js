import { LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      permanentLocation: LOCATION_NAMES.ANNEX,
      permanentLocationUI: LOCATION_NAMES.ANNEX_UI,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C411680 (NON-CONSORTIA) Verify the closing after Add holdings action on Non-consortia tenant (folijet)',
      { tags: ['extendedPath', 'folijet', 'C411680'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.addHoldings();
        InventoryNewHoldings.fillPermanentLocation(`${testData.permanentLocation} `);
        InventoryNewHoldings.saveAndClose();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyIsHoldingsCreated([`${testData.permanentLocationUI} >`]);
      },
    );
  });
});
