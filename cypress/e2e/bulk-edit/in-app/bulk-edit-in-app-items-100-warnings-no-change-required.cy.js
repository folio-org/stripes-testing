import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { BULK_EDIT_ACTIONS, ITEM_STATUS_NAMES } from '../../../support/constants';

let user;
let instanceId;
let holdingId;
let instanceTypeId;
let locationId;
let locationName;
let loanTypeId;
let materialTypeId;
let sourceId;
let temporaryLocationId;
const validItemsCount = 100;
const instanceTitle = `AT_C358977_Instance_${getRandomPostfix()}`;
const itemBarcodesFileName = `AT_C358977_ItemBarcodes_${getRandomPostfix()}.csv`;
const validItems = [];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          locationId = res.id;
          locationName = res.name;
          temporaryLocationId = res.id;
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
                    temporaryLocation: { id: temporaryLocationId },
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
      'C358977 Verify that 100 records returned in errors preview after updating records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C358977'] },
      () => {
        // Step 1: Select "Inventory-Items" option from "Record types" accordion => Select "Item barcode" from "Record Identifier" dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
          'Items',
          ITEM_IDENTIFIERS.ITEM_BARCODES,
        );

        // Step 2: Upload a .csv file with items barcodes (see Preconditions) by dragging it on the file drag and drop area
        // Step 3: Check DevTools => Find and click "preview?limit=100&offset=UPLOAD" row
        cy.intercept('GET', 'preview?limit=100&offset=0&step=UPLOAD').as('previewUpload');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.checkForUploading(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        cy.wait('@previewUpload').then(({ request, response }) => {
          expect(request.url).to.include('limit=100');
          expect(request.url).to.include('step=UPLOAD');
          expect(response.statusCode).to.equal(200);
          expect(response.body.rows).to.be.an('array');
          expect(response.body.rows).to.have.lengthOf(100);
        });

        // Step 4: Click "Actions" button => Select "Start Bulk edit" option
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();

        // Step 5: Select "Temporary item location" option from the "Options" dropdown
        BulkEditActions.selectOption('Temporary item location');

        // Step 6: Select "Replace with" option from the "Actions" dropdown
        BulkEditActions.selectAction(BULK_EDIT_ACTIONS.REPLACE_WITH);

        // Step 7: Select the same location that items are related to
        BulkEditActions.selectLocation(locationName);

        // Step 8: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(validItemsCount);

        // Step 9: Click the "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(0);
        BulkEditSearchPane.verifyErrorLabel(0, validItemsCount);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
        BulkEditSearchPane.verifyReasonForError(ERROR_MESSAGES.NO_CHANGE_REQUIRED);
        BulkEditSearchPane.verifyErrorsAccordionIncludesNumberOfIdentifiers(
          10,
          validItems.map((item) => item.barcode),
        );
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(10, false);
      },
    );
  });
});
