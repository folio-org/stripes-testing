import moment from 'moment';
import uuid from 'uuid';

import {
  INSTANCE_SOURCE_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Cataloging -> Creating new records', () => {
    const barcode = uuid();
    const testData = {
      barcode,
      callNumber: '331.2',
      instanceTitle: `C3505 autotest_instance_title_${barcode}`,
      user: {},
    };

    before('Create test user and login', () => {
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
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C3505 Create instance, holdings, and item records for a print resource which has not been acquired through Orders (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C3505'] },
      () => {
        // Click on "New" in the "Actions" menu
        const InventoryNewInstance = InventoryInstances.addNewInventory();

        // Populate the required fields, Click 'Save and close'
        InventoryNewInstance.fillInstanceFields({
          title: testData.instanceTitle,
          contributor: { name: 'autotest_contributor', nameType: 'Personal name' },
          publication: { place: 'autotest_publication_place', date: moment.utc().format() },
          description: 'autotest_physical_description',
          language: 'English',
          statusTerm: 'Cataloged (folio: cat)',
          mode: 'integrating resource',
        });
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.checkInstanceDetails({
          instanceInformation: [{ key: 'Source', value: INSTANCE_SOURCE_NAMES.FOLIO }],
        });

        // Select "Add holdings"
        const HoldingsRecordEdit = InventoryInstance.pressAddHoldingsButton();

        // Populate the following fields: "Permanent location", "Call number"
        // Click on "Save & Close" button
        HoldingsRecordEdit.fillHoldingFields({
          permanentLocation: LOCATION_NAMES.ANNEX,
          callNumber: testData.callNumber,
        });
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });

        // Select "Add item"
        const ItemRecordEdit = InventoryInstance.clickAddItemByHoldingName({
          holdingName: testData.callNumber,
          instanceTitle: testData.instanceTitle,
        });

        // Populate the following fields: "Material type", "Permanent loan type"
        // Click on "Save & Close" button
        ItemRecordEdit.fillItemRecordFields({
          barcode: testData.barcode,
          materialType: 'book',
          loanType: 'Can circulate',
        });
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.callNumber, 1);

        // Expand the holdings accordion
        InventoryInstance.checkHoldingsTableContent({
          name: LOCATION_NAMES.ANNEX_UI,
          records: [{ barcode: testData.barcode, status: ITEM_STATUS_NAMES.AVAILABLE }],
        });
      },
    );
  });
});
