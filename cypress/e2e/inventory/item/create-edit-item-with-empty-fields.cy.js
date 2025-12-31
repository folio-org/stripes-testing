import { LOAN_TYPE_NAMES, MATERIAL_TYPE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C959219_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix,
        itemsCount: 0,
      }),
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
    };

    let user;
    let location;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C959219_FolioInstance');

      cy.getLocations({
        limit: 1,
        query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
      }).then((res) => {
        location = res;

        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;

          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventorySearchAndFilter.waitLoading,
            });
            cy.reload();
            InventorySearchAndFilter.waitLoading();
          }, 20_000);
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstances[0].instanceId,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C959219 Create/Edit Item with empty fields (administrativeNotes, statisticalCodeIds, yearCaption, formerIds) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C959219'] },
      () => {
        // User is on the detail view pane of Instance record
        InventorySearchAndFilter.searchInstanceByTitle(instanceTitlePrefix);
        InventoryInstance.waitLoading();

        // Step 1. Click on the "Add item" button in "Holdings" accordion
        InventoryInstance.addItem();
        ItemRecordNew.waitLoading(instanceTitlePrefix);

        // Step 2. Fill in required fields
        ItemRecordNew.addMaterialType(testData.materialType);
        ItemRecordNew.addPermanentLoanType(testData.permanentLoanType);

        // Step 3. Add specified fields but don't fill added fields / don't select values from dropdown
        ItemRecordEdit.addAdministrativeNote('');
        ItemRecordEdit.addYearCaption('');
        ItemRecordEdit.addFormerIdentifier('');

        // Step 4. Click on the "Save & close" button
        cy.intercept('POST', '/inventory/items*').as('postItem');
        ItemRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceIsOpened(instanceTitlePrefix);
        cy.wait('@postItem').then(({ response }) => {
          const item = response.body;

          expect(item.administrativeNotes).to.deep.equal([]);
          expect(item.formerIds).to.deep.equal([]);
          expect(item.yearCaption).to.deep.equal([]);
          expect(item.statisticalCodeIds).to.deep.equal([]);
        });

        // Step 5: Click on created Item barcode - "Actions" - "Edit"
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.openItemEditForm(instanceTitlePrefix);

        // Step 6. Add specified fields but don't fill added fields / don't select values from dropdown
        ItemRecordEdit.addAdministrativeNote('');
        ItemRecordEdit.addYearCaption('');
        ItemRecordEdit.addFormerIdentifier('');

        // Step 7: Click on the "Save & close" button
        cy.intercept('GET', '/inventory/items/*').as('getItem');
        ItemRecordEdit.saveAndClose();
        cy.wait('@getItem').then(({ response }) => {
          const item = response.body;

          expect(item.administrativeNotes).to.deep.equal([]);
          expect(item.formerIds).to.deep.equal([]);
          expect(item.yearCaption).to.deep.equal([]);
          expect(item.statisticalCodeIds).to.deep.equal([]);
        });
      },
    );
  });
});
