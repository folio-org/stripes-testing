import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import { LOCATION_NAMES, MATERIAL_TYPE_NAMES, LOAN_TYPE_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

let user;
let afterItemCreatedTimestamp;
const folioInstanceTitle = `AT_C380630_FolioInstance_${getRandomPostfix()}`;
const marcInstance = {
  title: folioInstanceTitle,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
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

                  cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.SELECTED}"` }).then(
                    (loanType) => {
                      const loanTypeId = loanType[0].id;

                      cy.getDefaultMaterialType().then((materialType) => {
                        const materialTypeId = materialType.id;

                        InventoryItems.createItemViaApi({
                          barcode: marcInstance.itemBarcode,
                          holdingsRecordId: holdingsId,
                          materialType: { id: materialTypeId },
                          permanentLoanType: { id: loanTypeId },
                          status: { name: 'Available' },
                        }).then((itemId) => {
                          marcInstance.itemId = itemId;
                        });
                      });
                    },
                  );
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
        // editing item is treated as an update to the Instance record
        cy.wait(60_000);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380630 verb=ListIdentifiers: Verify that Instance MARC is retrieved in case its Item is edited (marc21_withholdings) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C380630'] },
      () => {
        afterItemCreatedTimestamp = DateTools.getCurrentDateForOaiPmh();

        // Step 1-3: Go to Inventory app and expand Item status accordion
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings(['']);

        // Step 4-5: Verify that response doesn't initially include Instance MARC record
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemCreatedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, false);
          },
        );

        // Step 6-7: Edit Item
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openItemByBarcode(marcInstance.itemBarcode);

        // Step 8: Click Actions menu => click Edit
        ItemRecordView.waitLoading();
        ItemRecordView.openItemEditForm(marcInstance.title);

        // Step 9: Edit mandatory fields with any available values
        ItemRecordEdit.fillItemRecordFields({ materialType: MATERIAL_TYPE_NAMES.DVD });

        // Step 10: Click Save & close button
        ItemRecordEdit.saveAndClose();

        // Step 11: Close Item window
        ItemRecordView.waitLoading();
        ItemRecordView.closeDetailView();

        // Step 12: Send ListIdentifiers request and verify Instance MARC is now retrieved
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemCreatedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, true);
          },
        );
      },
    );
  });
});
