import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ConfirmDeleteItemModal from '../../../support/fragments/inventory/modals/confirmDeleteItemModal';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Optimistic locking', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C466064_MarcBibInstance_${randomPostfix}`,
    };
    const marcInstanceFields = [
      {
        tag: '008',
        content: { ...QuickMarcEditor.defaultValid008Values },
      },
      {
        tag: '245',
        content: `$a ${testData.instanceTitle}`,
        indicators: ['1', '0'],
      },
    ];
    const initialVersion = '1';
    let instanceId;
    let holdingsId;
    let location;
    let materialType;
    let loanType;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C466064');

      cy.then(() => {
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (id) => {
            instanceId = id;
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
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C466064_MarcBibInstance');
    });

    it(
      'C466064 Verify that version of "Instance" record (source=MARC) was not updated after deleting of "Holdings" and "Item" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C466064'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 1: Note _version from GET inventory/instances when opening MARC editor
        cy.intercept('GET', `/inventory/instances/${instanceId}*`).as('getInstance');
        InventoryInstance.goToEditMARCBiblRecord();
        cy.wait('@getInstance').then(({ response }) => {
          expect(response.body._version).to.eq(initialVersion);
        });

        // Step 2: Close the Edit MARC record pane
        QuickMarcEditor.closeEditorPane();
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
        cy.intercept('GET', `/inventory/instances/${instanceId}*`).as('getInstanceAfter');
        InventoryInstance.goToEditMARCBiblRecord();
        cy.wait('@getInstanceAfter').then(({ response }) => {
          expect(response.body._version).to.eq(initialVersion);
        });
      },
    );
  });
});
