import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ConfirmDeleteItemModal from '../../../support/fragments/inventory/modals/confirmDeleteItemModal';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Optimistic locking', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C466068_FolioInstance_${randomPostfix}`,
    };
    const initialVersion = 1;
    let instanceId;
    let holdingsId;
    let location;
    let materialType;
    let loanType;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C466068_');

      cy.then(() => {
        InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
          ({ instanceData }) => {
            instanceId = instanceData.instanceId;
          },
        );
      })
        .then(() => {
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            location = res;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialType = res;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            loanType = loanTypes[0];
          });
        })
        .then(() => {
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId,
              permanentLocationId: location.id,
              sourceId: folioSource.id,
            }).then((holdings) => {
              holdingsId = holdings.id;
              InventoryItems.createItemViaApi({
                holdingsRecordId: holdingsId,
                materialType: { id: materialType.id },
                permanentLoanType: { id: loanType.id },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              });
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C466068 Verify that version of "Instance" record (source=FOLIO) was not updated after deleting of "Holdings" and "Item" record (promin)',
      { tags: ['extendedPath', 'promin', 'C466068'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 1: Note _version from GET inventory/instances response when opening Edit Instance
        cy.intercept('GET', `/inventory/instances/${instanceId}`).as('getInstance');
        InventoryInstance.editInstance();
        cy.wait('@getInstance').then(({ response }) => {
          expect(response.body._version).to.eq(initialVersion);
        });

        // Step 2: Close the "Edit Instance" pane
        InstanceRecordEdit.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: Delete Item record from associated Holdings
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.clickDeleteButton();
        ConfirmDeleteItemModal.clickDeleteButton();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        cy.recurse(
          () => InventoryItems.getItemsInHoldingsViaApi(holdingsId),
          (items) => items.length === 0,
          { limit: 10, timeout: 12000, delay: 1000 },
        );

        // Step 4: Delete Holdings record associated with Instance
        InventoryInstance.openHoldingView();
        HoldingsRecordView.delete();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        // wait for all the data to be loaded, otherwise detail view may reload
        cy.wait(3000);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.verifyHoldingsAbsent(location.name);

        // Step 5: Verify Instance _version did not change after Holdings and Item deletion
        cy.intercept('GET', `/inventory/instances/${instanceId}`).as('getInstanceAfter');
        InventoryInstance.editInstance();
        cy.wait('@getInstanceAfter').then(({ response }) => {
          expect(response.body._version).to.eq(initialVersion);
        });
      },
    );
  });
});
