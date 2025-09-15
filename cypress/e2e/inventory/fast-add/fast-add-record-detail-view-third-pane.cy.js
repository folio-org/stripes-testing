import { Permissions } from '../../../support/dictionary';
import FastAddNewRecord from '../../../support/fragments/inventory/fastAddNewRecord';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FastAdd from '../../../support/fragments/settings/inventory/instance-holdings-item/fastAdd';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Fast Add', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C422052_FolioInstance_${randomPostfix}`;
    const fastAddRecord1 = {
      resourceTitle: `${instanceTitlePrefix}_FastAdd_1`,
      itemBarcode: `AT_C422052_barcode1_${randomPostfix}`,
    };
    const fastAddRecord2 = {
      resourceTitle: `${instanceTitlePrefix}_FastAdd_2`,
      itemBarcode: `AT_C422052_barcode2_${randomPostfix}`,
    };
    const fastAddRecord3 = {
      resourceTitle: `${instanceTitlePrefix}_FastAdd_3`,
      itemBarcode: `AT_C422052_barcode3_${randomPostfix}`,
    };
    const fastAddData = { note: 'note' };
    let user;

    before('Set instance status', () => {
      cy.getAdminToken();
      FastAdd.changeDefaultInstanceStatusViaApi('uncat');
    });

    beforeEach('Create test user and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C422052_FolioInstance');
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then((res) => {
          fastAddData.permanentLocationOption = `${res.name} (${res.code}) `;
          fastAddData.location = res.name;
        });
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          fastAddData.resourceType = instanceTypes[0].name;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
          fastAddData.permanentLoanType = loanTypes[0].name;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          fastAddData.materialType = res.name;
        });

        // create a few records to search for
        const instanceData = InventoryInstances.generateFolioInstances({
          count: 3,
          instanceTitlePrefix,
          holdingsCount: 0,
        });
        instanceData.forEach((instance, index) => {
          instance.instanceTitle = `${instanceTitlePrefix}_Additional_${index + 1}`;
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
      'C422052 Detail view of record created via "Fast add" is opened in third pane of "Inventory" app (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422052'] },
      () => {
        // Test scenario 1: Create fast add record with empty search results
        cy.intercept('POST', '/inventory/instances').as('createInstance1');
        cy.intercept('POST', '/holdings-storage/holdings').as('createHolding1');
        cy.intercept('POST', '/inventory/items').as('createItem1');

        // Step 1: Click "Actions" menu and select "New fast add record"
        InventoryActions.openNewFastAddRecordForm();
        FastAddNewRecord.waitLoading();

        // Step 2: Fill all required fields and save
        FastAddNewRecord.fillFastAddNewRecordForm({ ...fastAddRecord1, ...fastAddData });
        FastAddNewRecord.saveAndClose();

        cy.wait(['@createInstance1', '@createHolding1', '@createItem1'], getLongDelay()).then(
          () => {
            // Verify detail view is opened in third pane with created record
            InstanceRecordView.verifyResourceTitle(fastAddRecord1.resourceTitle);
            InventoryInstance.openHoldings('');
            InventoryInstance.verifyItemBarcode(fastAddRecord1.itemBarcode);

            // Step 3: Search for existing record (ABA Journal)
            InventoryInstances.searchByTitle(`${instanceTitlePrefix}_Additional_1`);
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_Additional_1`);
            InventoryInstance.verifyInstanceTitle(`${instanceTitlePrefix}_Additional_1`);

            // Test scenario 2: Create fast add record with single search result
            cy.intercept('POST', '/inventory/instances').as('createInstance2');
            cy.intercept('POST', '/holdings-storage/holdings').as('createHolding2');
            cy.intercept('POST', '/inventory/items').as('createItem2');

            // Step 4: Click "Actions" menu and select "New fast add record"
            InventoryActions.openNewFastAddRecordForm();
            FastAddNewRecord.waitLoading();

            // Step 5: Fill all required fields and save
            FastAddNewRecord.fillFastAddNewRecordForm({ ...fastAddRecord2, ...fastAddData });
            FastAddNewRecord.saveAndClose();

            cy.wait(['@createInstance2', '@createHolding2', '@createItem2'], getLongDelay()).then(
              () => {
                // Verify the previous search result is still shown in second pane
                InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_Additional_1`);

                // Verify detail view of created record is opened in third pane
                InstanceRecordView.verifyResourceTitle(fastAddRecord2.resourceTitle);
                InventoryInstance.openHoldings('');
                InventoryInstance.verifyItemBarcode(fastAddRecord2.itemBarcode);

                // Step 6: Search for multiple records (*)
                InventoryInstances.searchByTitle(instanceTitlePrefix);

                // Verify multiple results are shown
                for (let i = 1; i <= 3; i++) {
                  InventorySearchAndFilter.verifySearchResult(
                    `${instanceTitlePrefix}_Additional_${i}`,
                  );
                }

                // Test scenario 3: Create fast add record with multiple search results
                cy.intercept('POST', '/inventory/instances').as('createInstance3');
                cy.intercept('POST', '/holdings-storage/holdings').as('createHolding3');
                cy.intercept('POST', '/inventory/items').as('createItem3');

                // Step 7: Click "Actions" menu and select "New fast add record"
                InventoryActions.openNewFastAddRecordForm();
                FastAddNewRecord.waitLoading();

                // Step 8: Fill all required fields and save
                FastAddNewRecord.fillFastAddNewRecordForm({ ...fastAddRecord3, ...fastAddData });
                FastAddNewRecord.saveAndClose();

                cy.wait(
                  ['@createInstance3', '@createHolding3', '@createItem3'],
                  getLongDelay(),
                ).then(() => {
                  // Verify results list in second pane is not changed (still shows multiple results)
                  for (let i = 1; i <= 3; i++) {
                    InventorySearchAndFilter.verifySearchResult(
                      `${instanceTitlePrefix}_Additional_${i}`,
                    );
                  }

                  // Verify detail view of created record is opened in third pane
                  InstanceRecordView.verifyResourceTitle(fastAddRecord3.resourceTitle);
                  InventoryInstance.openHoldings('');
                  InventoryInstance.verifyItemBarcode(fastAddRecord3.itemBarcode);
                });
              },
            );
          },
        );
      },
    );
  });
});
