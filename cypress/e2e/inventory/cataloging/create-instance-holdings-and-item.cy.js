import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import { LOCATION_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Cataloging', () => {
    const testData = {
      callNumber: '331.2',
      user: {},
    };

    before('Create test data', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C3505 Create instance, holdings, and item records for a print resource which has not been acquired through Orders (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // Click on "New" in the "Actions" menu
        const InventoryNewInstance = InventoryInstances.addNewInventory();

        // Populate the required fields, Click 'Save and close'
        InventoryNewInstance.fillInstanceFields({
          statusTerm: 'Cataloged (folio: cat)',
          mode: 'integrating resource',
        });
        InventoryNewInstance.clickSaveAndCloseButton();

        // Select "Add holdings"
        const HoldingsRecordEdit = InventoryInstance.openEditHoldingsForm();

        // Populate the following fields: "Permanent location", "Call number"
        // Click on "Save & Close" button
        HoldingsRecordEdit.fillHoldingFields({
          permanentLocation: LOCATION_NAMES.ANNEX,
          callNumber: testData.callNumber,
        });
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });

        // Select "Add item"
        const ItemRecordEdit = InventoryInstance.clickAddItemByHoldingName(testData.callNumber);

        // Populate the following fields: "Material type", "Permanent loan type"
        // Click on "Save & Close" button
        ItemRecordEdit.fillItemRecordFields({
          materialType: 'book',
          loanType: 'Can circulate',
        });
        ItemRecordEdit.saveAndClose({ itemSaved: true });

        // Expand the holdings accordion
        InventoryInstance.checkHoldingsTableContent({
          name: LOCATION_NAMES.ANNEX_UI,
          records: [{ barcode: 'No barcode', status: 'Available' }],
        });
      },
    );
  });
});
