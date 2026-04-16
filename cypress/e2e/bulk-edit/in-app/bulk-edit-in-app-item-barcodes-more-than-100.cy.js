import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

let user;
let instanceId;
let holdingId;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
let validUUIDs = [];
const instanceTitle = `AT_C358936_Instance_${getRandomPostfix()}`;
const validItemsCount = 105;
const invalidItemsCount = 12;
const itemUUIDsFileName = `AT_C358936_ItemUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemUUIDsFileName, true);
const validItems = [];
const invalidItemUUIDs = new Array(invalidItemsCount).fill(null).map(() => getRandomPostfix());

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((res) => {
          materialTypeId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          sourceId = folioSource.id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: instanceTitle,
            },
          }).then((createdInstanceData) => {
            instanceId = createdInstanceData.instanceId;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId,
              permanentLocationId: locationId,
              sourceId,
            }).then((holding) => {
              holdingId = holding.id;

              const itemsToCreate = Array.from({ length: validItemsCount }, (_, i) => ({
                barcode: `barcode_${i + 1}_${getRandomPostfix()}`,
                index: i,
              }));

              cy.wrap(itemsToCreate)
                .each((itemToCreate) => {
                  InventoryItems.createItemViaApi({
                    barcode: itemToCreate.barcode,
                    holdingsRecordId: holdingId,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    validItems.push({
                      uuid: item.id,
                      barcode: itemToCreate.barcode,
                    });
                  });
                })
                .then(() => {
                  validUUIDs = validItems.map((item) => item.uuid);
                  const allUUIDs = [...validUUIDs, ...invalidItemUUIDs];

                  FileManager.createFile(
                    `cypress/fixtures/${itemUUIDsFileName}`,
                    allUUIDs.join('\n'),
                  );

                  cy.login(user.username, user.password, {
                    path: TopMenu.bulkEditPath,
                    waiter: BulkEditSearchPane.waitLoading,
                  });
                });
            });
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      validUUIDs.forEach((itemId) => {
        InventoryItems.deleteItemViaApi(itemId);
      });

      InventoryHoldings.deleteHoldingRecordViaApi(holdingId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C358936 Items | Verify the preview of matched records uploading more than 100 Identifiers (firebird)',
      { tags: ['extendedPath', 'firebird', 'C358936'] },
      () => {
        // Step 1: Select "Inventory-items" option from "Record types" accordion => Select "Item UUIDs" from "Record Identifier" dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');

        // Step 2: Upload a .csv file with items identifiers (see Preconditions) by dragging it on the file drag and drop area
        // Set up intercepts for Steps 7 and 8 before uploading
        cy.intercept('GET', /\/bulk-operations\/.*\/preview.*[?&]limit=100.*[&]step=UPLOAD/).as(
          'preview',
        );
        cy.intercept('GET', /\/bulk-operations\/.*\/errors.*[?&]limit=10/).as('errors');

        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.checkForUploading(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 7: Check "preview?limit=100&offset=0&step=UPLOAD" request in "DevTools"
        cy.wait('@preview').then((interception) => {
          expect(interception.request.url).to.include('limit=100');
          expect(interception.request.url).to.include('step=UPLOAD');
          expect(interception.response.body.rows).to.have.length(100);
        });

        // Step 8: Check "errors?limit=10" request in "DevTools"
        cy.wait('@errors').then((interception) => {
          expect(interception.request.url).to.include('limit=10');
          expect(interception.response.body.errors).to.have.length(10);
          expect(interception.response.body.totalRecords).to.equal(invalidItemsCount);
        });

        // Step 3: Check the result of uploading the .csv file with Items UUIDs
        BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
        BulkEditSearchPane.verifyInputLabel(`${validItemsCount} item records matched`);
        BulkEditSearchPane.verifyFileNameHeadLine(itemUUIDsFileName);
        BulkEditSearchPane.verifyPopulatedPreviewPage();
        BulkEditSearchPane.verifyErrorLabel(invalidItemsCount);
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(10, false);
        BulkEditSearchPane.verifyPaginatorInMatchedRecords(100, false);

        // Step 4: Click "Actions" button => Select "Download matched records (CSV)" option
        BulkEditActions.downloadMatchedResults();

        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.matchedRecordsCSV, validItemsCount);

        validItems.slice(0, 5).forEach((item) => {
          ExportFile.verifyFileIncludes(fileNames.matchedRecordsCSV, [item.uuid]);
        });

        // Step 5: Click "Actions" button => Select "Download errors (CSV)" option
        BulkEditActions.downloadErrors();

        // Step 6: Check that downloaded file includes all invalid identifiers with errors (more than 10 identifiers) but not only Top 10 invalid identifiers displayed in the "Errors" accordion
        invalidItemUUIDs.forEach((uuid) => {
          ExportFile.verifyFileIncludes(fileNames.errorsFromMatching, [
            `ERROR,${uuid},${ERROR_MESSAGES.NO_MATCH_FOUND}`,
          ]);
        });
      },
    );
  });
});
