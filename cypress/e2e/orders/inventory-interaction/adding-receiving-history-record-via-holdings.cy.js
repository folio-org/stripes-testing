import { Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Holdings', () => {
    const testData = {
      enumeration: '1',
      chronology: '2',
    };

    before('Create test data', () => {
      testData.instanceTitle = `AT_C464325_FolioInstance_${getRandomPostfix()}`;
      testData.itemBarcode = String(randomFourDigitNumber());

      cy.getAdminToken();
      InventoryInstances.createInstanceViaApi(testData.instanceTitle, testData.itemBarcode);

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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C464325 Adding "Receiving history" record via Holdings and making it visible for public (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C464325'] },
      () => {
        // Step 1: Click "View holdings" on Instance details pane
        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceTitle);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();

        // Step 2: Actions > Edit
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();

        // Steps 3-4: Add receiving history, fill Enumeration and Chronology, leave Public display unchecked
        // addReceivingHistoryValues always marks public display, so toggle it back off
        HoldingsRecordEdit.addReceivingHistoryValues({
          enumeration: testData.enumeration,
          chronology: testData.chronology,
        });
        HoldingsRecordEdit.markAsPublicDisplay();

        // Step 5: Save & close
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.waitLoading();

        // Step 6: Verify Receiving history record — Public display unchecked
        HoldingsRecordView.checkReceivingHistoryValues({
          enumeration: testData.enumeration,
          chronology: testData.chronology,
          publicDisplay: false,
        });

        // Step 7: Actions > Edit
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();

        // Step 8: Check the Public display checkbox
        HoldingsRecordEdit.markAsPublicDisplay();

        // Step 9: Save & close
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.waitLoading();

        // Step 10: Verify Receiving history record — Public display checked
        HoldingsRecordView.checkReceivingHistoryValues({
          enumeration: testData.enumeration,
          chronology: testData.chronology,
          publicDisplay: true,
        });
      },
    );
  });
});
