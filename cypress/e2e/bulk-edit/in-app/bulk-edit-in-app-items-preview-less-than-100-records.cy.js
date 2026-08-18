import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BULK_EDIT_ACTIONS, ITEM_STATUS_NAMES, LOCATION_IDS } from '../../../support/constants';

let user;
let instanceId;
let holdingId;
let instanceTypeId;
let permanentLocationId;
let loanTypeId;
let materialTypeId;
let sourceId;

const validItemsCount = 100;
const itemsToChangeCount = 95; // items currently at "Annex" → will be replaced with "Main Library"
const itemsNotChangedCount = validItemsCount - itemsToChangeCount; // already at "Main Library"
const replacementLocationName = 'Main Library';
const instanceTitle = `AT_C358976_Instance_${getRandomPostfix()}`;
const itemBarcodesFileName = `AT_C358976_ItemBarcodes_${getRandomPostfix()}.csv`;
const validItems = [];

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
          permanentLocationId = res.id;
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
              permanentLocationId,
              sourceId,
            }).then((holding) => {
              holdingId = holding.id;

              const itemsToCreate = Array.from({ length: validItemsCount }, (_, i) => ({
                barcode: `barcode_${i + 1}_${getRandomPostfix()}`,
                // First "itemsToChangeCount" items go to ANNEX, the rest go to MAIN_LIBRARY
                temporaryLocationId:
                  i < itemsToChangeCount ? LOCATION_IDS.ANNEX : LOCATION_IDS.MAIN_LIBRARY,
              }));

              cy.wrap(itemsToCreate)
                .each((itemToCreate) => {
                  InventoryItems.createItemViaApi({
                    barcode: itemToCreate.barcode,
                    holdingsRecordId: holdingId,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    temporaryLocation: { id: itemToCreate.temporaryLocationId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    validItems.push({
                      uuid: item.id,
                      barcode: itemToCreate.barcode,
                    });
                  });
                })
                .then(() => {
                  const validBarcodes = validItems.map((item) => item.barcode);

                  FileManager.createFile(
                    `cypress/fixtures/${itemBarcodesFileName}`,
                    validBarcodes.join('\n'),
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

      validItems.forEach((item) => {
        InventoryItems.deleteItemViaApi(item.uuid);
      });

      InventoryHoldings.deleteHoldingRecordViaApi(holdingId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C358976 Verify preview after updating less than 100 records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C358976'] },
      () => {
        // Step 1: Select "Inventory-items" option from "Record types" accordion
        // => Select "Item barcode" from "Record Identifier" dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
          'Items',
          ITEM_IDENTIFIERS.ITEM_BARCODES,
        );
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);

        // Step 2: Upload a .csv file with items barcodes by dragging it on the file drag and drop area
        // Step 3: Check "preview?limit=100&offset=0&step=UPLOAD" request in "DevTools"
        cy.intercept('GET', /\/bulk-operations\/.*\/preview.*[?&]limit=100.*[&]step=UPLOAD/).as(
          'previewUpload',
        );

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.checkForUploading(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        cy.wait('@previewUpload').then(({ request, response }) => {
          expect(request.url).to.include('limit=100');
          expect(request.url).to.include('step=UPLOAD');
          expect(response.statusCode).to.equal(200);
          expect(response.body.rows).to.be.an('array');
          expect(response.body.rows).to.have.lengthOf(validItemsCount);
        });

        // Step 4: Click "Actions" menu => Check checkbox (if not yet checked) next to "Item temporary location"
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Item temporary location');

        // Step 5: Click "Actions" button => Select "Start Bulk edit" option
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();

        // Step 6: Select "Temporary item location" option from the "Options" dropdown
        BulkEditActions.selectOption('Temporary item location');

        // Step 7: Select "Replace with" option from the "Select action" dropdown
        BulkEditActions.selectAction(BULK_EDIT_ACTIONS.REPLACE_WITH);

        // Step 8: In "Select location" dropdown select location that will update only a part of Items
        BulkEditActions.selectLocation(replacementLocationName);

        // Step 9: Click "Confirm changes" button
        // Step 10: Check "preview?limit=100&offset=0&step=EDIT" request in "DevTools"
        cy.intercept('GET', /\/bulk-operations\/.*\/preview.*[?&]limit=100.*[&]step=EDIT/).as(
          'previewEdit',
        );
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(validItemsCount);

        cy.wait('@previewEdit').then(({ request, response }) => {
          expect(request.url).to.include('limit=100');
          expect(request.url).to.include('step=EDIT');
          expect(response.statusCode).to.equal(200);
          expect(response.body.rows).to.be.an('array');
          expect(response.body.rows).to.have.lengthOf(validItemsCount);
        });

        // Step 11: Click the "Commit changes" button
        // Step 12: Check "preview?limit=100&offset=0&step=COMMIT" request in "DevTools"
        // Step 13: Check "errors?limit=10" request in "DevTools"
        cy.intercept('GET', /\/bulk-operations\/.*\/preview.*[?&]limit=100.*[&]step=COMMIT/).as(
          'previewCommit',
        );
        cy.intercept('GET', /\/bulk-operations\/.*\/errors.*[?&]limit=10/).as('commitErrors');

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        cy.wait('@previewCommit').then(({ request, response }) => {
          expect(request.url).to.include('limit=100');
          expect(request.url).to.include('step=COMMIT');
          expect(response.statusCode).to.equal(200);
          expect(response.body.rows).to.be.an('array');
          expect(response.body.rows.length).to.be.lessThan(validItemsCount);
          expect(response.body.rows).to.have.lengthOf(itemsToChangeCount);
        });

        cy.wait('@commitErrors').then(({ request, response }) => {
          expect(request.url).to.include('limit=10');
          expect(response.statusCode).to.equal(200);
          expect(response.body.errors).to.be.an('array');
          expect(response.body.errors.length).to.be.lessThan(10);
          expect(response.body.errors).to.have.lengthOf(itemsNotChangedCount);
          expect(response.body.totalRecords).to.equal(itemsNotChangedCount);
        });

        BulkEditActions.verifySuccessBanner(itemsToChangeCount);
        BulkEditSearchPane.verifyErrorLabel(0, itemsNotChangedCount);
      },
    );
  });
});
