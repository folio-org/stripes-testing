import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ConfirmDeleteItemModal from '../../../support/fragments/inventory/modals/confirmDeleteItemModal';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import { LOCATION_NAMES, ITEM_STATUS_NAMES, LOAN_TYPE_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

let user;
const marcInstance = { title: `AT_C375968_MarcInstance_${getRandomPostfix()}` };
const itemData = {
  barcode: `AT_C375968_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
          marcInstance.id = instanceId;

          cy.getInstanceById(marcInstance.id).then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
              (location) => {
                cy.createSimpleMarcHoldingsViaAPI(
                  marcInstance.id,
                  marcInstance.hrid,
                  location.code,
                ).then((holdingsId) => {
                  marcInstance.holdingsId = holdingsId;

                  cy.getDefaultMaterialType().then((materialTypes) => {
                    const materialTypeId = materialTypes.id;

                    cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
                      (loanTypes) => {
                        const loanTypeId = loanTypes[0].id;

                        InventoryItems.createItemViaApi({
                          holdingsRecordId: marcInstance.holdingsId,
                          barcode: itemData.barcode,
                          materialType: { id: materialTypeId },
                          permanentLoanType: { id: loanTypeId },
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        }).then((item) => {
                          marcInstance.itemId = item.id;
                        });
                      },
                    );
                  });
                });
              },
            );
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });

        // For clear test results, it is necessary to wait to ensure that
        // deleting the Item record is treated as an update to the Instance record
        cy.wait(60_000);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C375968 ListRecords: Verify that SRS with deleted Items are harvested (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375968'] },
      () => {
        // Step 1: Go to Inventory app, select Holdings tab, search for SRS record with associated Holdings and Item
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 2: Click on the Holdings accordion and click on the Item's barcode hyperlink
        InventoryInstance.openHoldingsAccordion(LOCATION_NAMES.MAIN_LIBRARY_UI);
        InventoryInstance.openItemByBarcodeAndIndex(itemData.barcode);
        ItemRecordView.waitLoading();

        // Step 3: Click Actions button and select Delete element
        const dateAndTimeOfDeletion = DateTools.getCurrentDateForOaiPmh();
        ItemRecordView.clickDeleteButton();
        ConfirmDeleteItemModal.waitLoading();

        // Step 4: Select Delete option in confirmation modal
        ConfirmDeleteItemModal.clickDeleteButton();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyItemBarcode(itemData.barcode, false);

        // Step 5: Send ListRecords request to verify SRS with deleted Item is harvested
        cy.getAdminToken();
        OaiPmh.listRecordsRequest('marc21_withholdings', dateAndTimeOfDeletion).then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, false, true);
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: marcInstance.id },
          );
        });
      },
    );
  });
});
