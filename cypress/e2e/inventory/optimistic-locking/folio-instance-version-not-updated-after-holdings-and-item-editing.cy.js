import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Optimistic locking', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C466067_FolioInstance_${randomPostfix}`,
      receiptStatus: 'Status 1',
    };
    const initialVersion = 1;
    let instanceId;
    let holdingsId;
    let itemId;
    let location;
    let materialType;
    let loanType;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C466067_');

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
              }).then((item) => {
                itemId = item.id;
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
      'C466067 Verify that version of "Instance" record (source=FOLIO) was not updated after editing of "Holdings" and "Item" record (promin)',
      { tags: ['extendedPath', 'promin', 'C466067'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 1: Note _version from GET inventory/instances when opening Edit Instance
        cy.intercept('GET', `/inventory/instances/${instanceId}`).as('getInstance');
        InventoryInstance.editInstance();
        cy.wait('@getInstance').then(({ response }) => {
          expect(response.body._version).to.eq(initialVersion);
        });

        // Step 2: Close the "Edit Instance" pane
        InstanceRecordEdit.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: Note _version from GET holdings-storage/holdings when opening Holdings edit
        cy.intercept('GET', `/holdings-storage/holdings/${holdingsId}`).as('getHoldings');
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();
        cy.wait('@getHoldings').then(({ response }) => {
          expect(response.body._version).to.eq(initialVersion);
        });

        // Step 4: Edit Holdings record - update receipt status, save
        HoldingsRecordEdit.fillReceiptStatus(testData.receiptStatus);
        cy.intercept('GET', `/holdings-storage/holdings/${holdingsId}`).as('getHoldingsAfterEdit');
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });

        // Step 5: Verify Holdings _version incremented by 1
        cy.wait('@getHoldingsAfterEdit').then(({ response }) => {
          expect(response.body._version).to.eq(initialVersion + 1);
        });
        HoldingsRecordView.waitLoading();

        // Step 6: Close the Holdings detail view
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 7: Open Item record - note _version from GET inventory/items
        cy.intercept('GET', `/inventory/items/${itemId}`).as('getItem');
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcode('No barcode');
        cy.wait('@getItem').then(({ response }) => {
          expect(response.body._version).to.eq(`${initialVersion}`);
        });

        // Step 8: Edit Item record - update barcode, save
        ItemRecordView.openItemEditForm(testData.instanceTitle);
        ItemRecordEdit.addBarcode(`C466067-${randomPostfix}`);
        cy.intercept('GET', `/inventory/items/${itemId}`).as('getItemAfterEdit');
        ItemRecordEdit.saveAndClose({ itemSaved: true });

        // Step 9: Verify Item _version incremented by 1
        cy.wait('@getItemAfterEdit').then(({ response }) => {
          expect(response.body._version).to.eq(`${initialVersion + 1}`);
        });
        ItemRecordView.waitLoading();

        // Step 10: Close Item detail view
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 11: Verify Instance _version did not change after Holdings and Item updates
        cy.intercept('GET', `/inventory/instances/${instanceId}`).as('getInstanceAfter');
        InventoryInstance.editInstance();
        cy.wait('@getInstanceAfter').then(({ response }) => {
          expect(response.body._version).to.eq(initialVersion);
        });
      },
    );
  });
});
