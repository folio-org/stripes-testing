import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  STRING_OPERATORS,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS, ITEM_STATUS_NAMES } from '../../../../support/constants';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let statisticalCodes;
let fileNames;
const folioInstance = {
  title: `AT_C813673_FolioInstance_${getRandomPostfix()}`,
};
const expectedItems = [
  {
    // Item 1
    tags: { tagList: ['important'] },
    formerIds: ['abc12345'],
  },
  {
    // Item 2
    tags: { tagList: ['urgent', 'important', 'test'] },
    formerIds: ['xyz12345', 'ABC12345', '12345'],
  },
  {
    // Item 3
    tags: { tagList: ['test'] },
    formerIds: ['12345'],
  },
  {
    // Item 4
    tags: { tagList: [] },
    formerIds: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C813673');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get statistical codes first (get 4 codes to match TestRail preconditions)
          cy.getStatisticalCodes({ limit: 4 }).then((codes) => {
            statisticalCodes = codes;

            // Get statistical code types to build full names
            cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
              statisticalCodes.forEach((code) => {
                code.typeName = codeTypes.filter(
                  (item) => item.id === code.statisticalCodeTypeId,
                )[0].name;
                code.fullName = `${code.typeName}: ${code.code} - ${code.name}`;
              });

              // Helper function to populate string properties for UI display
              const populateItemStringProperties = (itemData, statCodes) => {
                itemData.tagsString = itemData.tags.tagList.join(' | ');
                itemData.formerIdsString = itemData.formerIds.join(' | ');

                if (itemData.statisticalCodeIds.length === 0) {
                  itemData.statisticalCodeName = '';
                  return;
                }

                if (itemData.statisticalCodeIds.length === 1) {
                  const code = statCodes.find((c) => c.id === itemData.statisticalCodeIds[0]);
                  itemData.statisticalCodeName = code.fullName;
                } else {
                  const codeNames = itemData.statisticalCodeIds.map(
                    (id) => statCodes.find((c) => c.id === id).fullName,
                  );
                  itemData.statisticalCodeName = codeNames.join(' | ');
                  itemData.statisticalCodeNameInBulkEditForm = codeNames.join('|');
                }
              };

              // Statistical code assignments for each item
              const itemStatisticalCodeConfig = [
                { itemIndex: 0, codeIndexes: [0] },
                { itemIndex: 1, codeIndexes: [0, 1, 2] },
                { itemIndex: 2, codeIndexes: [3] },
                { itemIndex: 3, codeIndexes: [] },
              ];

              // Assign statistical codes to items based on configuration
              itemStatisticalCodeConfig.forEach((config) => {
                expectedItems[config.itemIndex].statisticalCodeIds = config.codeIndexes.map(
                  (index) => statisticalCodes[index].id,
                );
                populateItemStringProperties(expectedItems[config.itemIndex], statisticalCodes);
              });

              // Get required IDs for instance, holding, and items
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                const instanceTypeId = instanceTypeData[0].id;

                cy.getDefaultMaterialType().then((materialType) => {
                  cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
                    cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                      cy.getLocations({ limit: 1 }).then((location) => {
                        // Create items array with all 4 items
                        const itemsToCreate = expectedItems.map((itemData, index) => ({
                          barcode: `AT_C813673_Item_${index + 1}_${getRandomPostfix()}`,
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          materialType: { id: materialType.id },
                          permanentLoanType: { id: loanTypes[0].id },
                          statisticalCodeIds: itemData.statisticalCodeIds,
                          tags: itemData.tags,
                          formerIds: itemData.formerIds,
                        }));

                        // Create one instance with one holding containing all items
                        InventoryInstances.createFolioInstanceViaApi({
                          instance: {
                            instanceTypeId,
                            title: folioInstance.title,
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
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      // Trillium
      it.skip(
        'C813673 Search items by Statistical code names, Tags, Former identifiers (firebird)',
        { tags: [] },
        () => {
          // Step 1: Search items by "Item — Statistical code names" field using "equals" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(itemFieldValues.itemStatisticalCodeNames);
          QueryModal.verifySelectedField(itemFieldValues.itemStatisticalCodeNames);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(statisticalCodes[0].fullName);
          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.itemBarcode, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C813673_Item', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            `(items.statistical_code_names == ${statisticalCodes[0].fullName}) AND (items.barcode starts with AT_C813673_Item)`,
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Items 1, 2
          const expectedItemsToFind = [expectedItems[0], expectedItems[1]];

          expectedItemsToFind.forEach((item) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              item.barcode,
              itemFieldValues.itemStatisticalCodeNames,
              item.statisticalCodeName,
            );
          });

          // Not expected to find: Items 3, 4
          const notExpectedToFindItemBarcodes = [
            expectedItems[2].barcode,
            expectedItems[3].barcode,
          ];

          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 2: Click "Run query" button and check "Statistical codes" column in Preview of records matched
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview').then((interception) => {
            const bulkEditJobId = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];

            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATISTICAL_CODES,
            );

            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              expectedItems[0].barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATISTICAL_CODES,
              expectedItems[0].statisticalCodeName,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              expectedItems[1].barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATISTICAL_CODES,
              expectedItems[1].statisticalCodeNameInBulkEditForm,
            );

            // Step 3: Download matched records (CSV) and check populating "Statistical codes" column in the file
            fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(bulkEditJobId, true);

            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              expectedItems[0].barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATISTICAL_CODES,
              expectedItems[0].statisticalCodeName,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              expectedItems[1].barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATISTICAL_CODES,
              expectedItems[1].statisticalCodeNameInBulkEditForm,
            );
          });

          // Step 4: Navigate back to build query
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 5: Search items by "Item — Tags" field using "equals" operator
          QueryModal.selectField(itemFieldValues.itemTags);
          QueryModal.verifySelectedField(itemFieldValues.itemTags);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('important');
          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.itemBarcode, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C813673_Item', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(items.tags == important) AND (items.barcode starts with AT_C813673_Item)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Items 1, 2
          expectedItemsToFind.forEach((item) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              item.barcode,
              itemFieldValues.itemTags,
              item.tagsString,
            );
          });

          // Not expected to find: Items 3 and 4
          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 6: Search items by "Item — Former identifiers" field using "starts with" operator
          QueryModal.selectField(itemFieldValues.itemFormerIdentifiers);
          QueryModal.verifySelectedField(itemFieldValues.itemFormerIdentifiers);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('abc');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(items.former_ids starts with abc) AND (items.barcode starts with AT_C813673_Item)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Items 1, 2
          expectedItemsToFind.forEach((item) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              item.barcode,
              itemFieldValues.itemFormerIdentifiers,
              item.formerIdsString,
            );
          });

          // Not expected to find: Items 3, 4
          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });
        },
      );
    });
  });
});
