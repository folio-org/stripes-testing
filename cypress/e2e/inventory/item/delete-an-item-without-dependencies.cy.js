import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ConfirmDeleteItemModal from '../../../support/fragments/inventory/modals/confirmDeleteItemModal';
import TopMenu from '../../../support/fragments/topMenu';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const instanceTitlePrefix = `AT_C715_FolioInstance_${getRandomPostfix()}`;
    const barcodeOption = searchItemsOptions[1];
    const hridOption = searchItemsOptions[9];
    const uuidOption = searchItemsOptions[10];
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        holdingsCount: 1,
        itemsCount: 0,
        instanceTitlePrefix,
      }),
    };

    let user;
    let location;
    let materialType;
    let loanType;
    let holdingsRecordId;
    let createdItem;

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C715_FolioInstance');

      cy.then(() => {
        cy.getLocations({
          limit: 10,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then(() => {
          location = Cypress.env('locations')[0];
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
          loanType = loanTypes[0];
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          materialType = res;
        });
      })
        .then(() => {
          // Create instance with 1 holdings
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
          holdingsRecordId = testData.folioInstances[0].holdings[0].id;
        })
        .then(() => {
          // Create item for holdings
          return cy
            .createItem({
              barcode: generateItemBarcode(),
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
            })
            .then((response) => {
              const itemId = response.body.id;

              return cy.getItems({ query: `id==${itemId}` }).then((itemData) => {
                createdItem = itemData;
              });
            });
        });

      cy.createTempUser([Permissions.uiInventoryViewCreateEditDeleteItems.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstances[0].instanceId,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C715 Delete an item without dependencies (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C715', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(barcodeOption, createdItem.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.clickDeleteButton();
        ConfirmDeleteItemModal.clickDeleteButton();
        InventoryInstance.verifyItemBarcode(createdItem.barcode, false);
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchByParameter(barcodeOption, createdItem.barcode);
        InventorySearchAndFilter.verifyNoRecordsFound();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchByParameter(hridOption, createdItem.hrid);
        InventorySearchAndFilter.verifyNoRecordsFound();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchByParameter(uuidOption, createdItem.id);
        InventorySearchAndFilter.verifyNoRecordsFound();
      },
    );
  });
});
