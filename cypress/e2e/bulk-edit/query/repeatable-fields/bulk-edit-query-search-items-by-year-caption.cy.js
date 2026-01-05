import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

let user;
const folioInstance = {
  title: `AT_C825266_FolioInstance_${getRandomPostfix()}`,
};

// Shared expected items array that will be used for both API creation and verification
const expectedItems = [
  {
    // Item 1
    yearCaption: ['v. 8, no. 3-v. 10, no. 1 1989 July/Sept-1991 Jan/Mar'],
  },
  {
    // Item 2 - multiple year caption entries
    yearCaption: ['v. 1-5 1982-1986', 'v. 5-10 1986 Apr-1991 Mar', 'v. 10-11 1991 Apr-1992 Sept'],
  },
  {
    // Item 3
    yearCaption: ['v. 12 1993'],
  },
  {
    // Item 4 - no year caption
    yearCaption: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C825266');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get required IDs for instance, holding, and items
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            const instanceTypeId = instanceTypeData[0].id;

            cy.getDefaultMaterialType().then((materialType) => {
              cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
                cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                  cy.getLocations({ limit: 1 }).then((location) => {
                    // Create items array with all 4 items
                    const itemsToCreate = expectedItems.map((itemData, index) => ({
                      barcode: `AT_C825266_Item_${index + 1}_${getRandomPostfix()}`,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      materialType: { id: materialType.id },
                      permanentLoanType: { id: loanTypes[0].id },
                      yearCaption: itemData.yearCaption,
                    }));

                    // Create one instance with one holding containing all 4 items
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId,
                        title: folioInstance.title,
                        languages: ['fin'],
                      },
                      holdings: [
                        {
                          holdingsTypeId: holdingTypes[0].id,
                          permanentLocationId: location.id,
                        },
                      ],
                      items: itemsToCreate,
                    }).then((createdInstanceData) => {
                      folioInstance.id = createdInstanceData.instanceId;

                      // Populate barcodes in the expectedItems array
                      createdInstanceData.items.forEach((item, index) => {
                        expectedItems[index].barcode = item.barcode;
                        expectedItems[index].hrid = item.hrid;
                      });
                    });
                  });
                });
              });
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      });

      it(
        'C825266 Search items by Year, caption (firebird)',
        { tags: ['extendedPath', 'firebird', 'C825266'] },
        () => {
          // Step 1-2: Search items by "Items — Year, caption" field using "contains" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(itemFieldValues.yearCaption);
          QueryModal.verifySelectedField(itemFieldValues.yearCaption);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('1991');
          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.itemBarcode, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C825266_Item', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(items.year_caption contains 1991) AND (items.barcode starts with AT_C825266_Item)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Item 1 and Item 2 (both contain "1991")
          const expectedItemsToFind = [expectedItems[0], expectedItems[1]];

          expectedItemsToFind.forEach((item) => {
            const expectedYearCaptionDisplay = item.yearCaption.join(' | ');

            QueryModal.verifyMatchedRecordsByIdentifier(
              item.barcode,
              itemFieldValues.yearCaption,
              expectedYearCaptionDisplay,
            );
          });

          // Not expected to find: Item 3 and Item 4
          const notExpectedToFindItemBarcodes = [
            expectedItems[2].barcode,
            expectedItems[3].barcode,
          ];

          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 3: Click "Show columns" above the result table > Check checkbox next to "Instance — Languages"
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns(itemFieldValues.instanceLanguages);
          QueryModal.clickShowColumnsButton();

          // Step 4: "Check values of languages displayed in "Instance — Languages" column"
          expectedItemsToFind.forEach((item) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              item.barcode,
              itemFieldValues.instanceLanguages,
              'Finnish',
            );
          });
        },
      );
    });
  });
});
