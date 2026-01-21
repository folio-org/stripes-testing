import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { LOCATION_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('Inventory', () => {
  describe('Holdings', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C959217_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix,
        holdingsCount: 0,
        itemsCount: 0,
      }),
    };
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C959217_FolioInstance');

      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
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

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstances[0].instanceId,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C959217 Create/Edit Holdings with empty fields (administrativeNotes, statisticalCodeIds, formerIds) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C959217'] },
      () => {
        // User is on the detail view pane of Instance record
        InventorySearchAndFilter.searchInstanceByTitle(instanceTitlePrefix);
        InventoryInstance.waitLoading();

        // Step 1. Click on the "Add holdings" button
        InventoryInstance.pressAddHoldingsButton();
        HoldingsRecordEdit.waitLoading();

        // Step 2. Fill in required fields
        HoldingsRecordEdit.fillHoldingFields({
          permanentLocation: LOCATION_NAMES.ANNEX,
        });

        // Step 3. Add specified fields but don't fill added fields / don't select values from dropdown
        HoldingsRecordEdit.addAdministrativeNote('');
        HoldingsRecordEdit.addFormerHoldingsId('');

        // Step 4. Click on the "Save & close" button
        cy.intercept('POST', '/holdings-storage/holdings').as('postHoldings');
        HoldingsRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceIsOpened(instanceTitlePrefix);
        cy.wait('@postHoldings').then(({ response }) => {
          const holdings = response.body;

          expect(holdings.administrativeNotes).to.deep.equal([]);
          expect(holdings.formerIds).to.deep.equal([]);
          expect(holdings.statisticalCodeIds).to.deep.equal([]);
        });

        // Step 5. Click on "View holdings" - "Actions" - "Edit"
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();

        // Step 6. Add specified fields but don't fill added fields / don't select values from dropdown
        HoldingsRecordEdit.addAdministrativeNote('');
        HoldingsRecordEdit.addFormerHoldingsId('');

        // Step 7. Click on the "Save & close" button
        cy.intercept('GET', '/holdings-storage/holdings/*').as('getHoldings');
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.checkHoldingRecordViewOpened();
        cy.wait('@getHoldings').then(({ response }) => {
          const holdings = response.body;

          expect(holdings.administrativeNotes).to.deep.equal([]);
          expect(holdings.formerIds).to.deep.equal([]);
          expect(holdings.statisticalCodeIds).to.deep.equal([]);
        });
      },
    );
  });
});
