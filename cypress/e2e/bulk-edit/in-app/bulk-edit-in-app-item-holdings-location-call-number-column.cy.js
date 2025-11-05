import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import {
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const instance = {
  title: `C446017 autotestName_${getRandomPostfix()}`,
  holdingsIDs: [],
  itemIds: [],
  itemHrids: [],
};
const callNumber = 'R11.A38\\';
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(itemUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.getAdminToken()
          .then(() => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              instance.instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              instance.holdingTypeId = res[0].id;
            });
            cy.getLocations({ limit: 1 }).then((res) => {
              instance.locationId = res.id;
            });
            cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.SELECTED}"` }).then((res) => {
              instance.loanTypeId = res[0].id;
            });
            cy.getDefaultMaterialType().then((res) => {
              instance.materialTypeId = res.id;
            });
            InventoryInstances.getCallNumberTypes({
              query: `name="${CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL}"`,
            }).then((res) => {
              instance.callNumberTypeId = res[0].id;
            });
            const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
            instance.defaultLocation = Location.getDefaultLocation(servicePoint.id);
            Location.createViaApi(instance.defaultLocation);
            ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
              instance.servicepointId = servicePoints[0].id;
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instance.instanceTypeId,
                title: instance.title,
              },
              holdings: [
                {
                  holdingsTypeId: instance.holdingTypeId,
                  permanentLocationId: instance.defaultLocation.id,
                },
                {
                  holdingsTypeId: instance.holdingTypeId,
                  permanentLocationId: instance.defaultLocation.id,
                  callNumber,
                  callNumberTypeId: instance.callNumberTypeId,
                },
              ],
            })
              .then((instanceData) => {
                instance.id = instanceData.instanceId;

                instanceData.holdingIds.forEach((holdingId) => {
                  instance.holdingsIDs.push(holdingId.id);
                });

                instance.holdingsIDs.forEach((holdingID) => {
                  InventoryItems.createItemViaApi({
                    barcode: getRandomPostfix(),
                    holdingsRecordId: holdingID,
                    materialType: { id: instance.materialTypeId },
                    permanentLoanType: { id: instance.loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    instance.itemIds.push(item.id);
                    instance.itemHrids.push(item.hrid);
                  });
                });
              })
              .then(() => {
                FileManager.createFile(
                  `cypress/fixtures/${itemUUIDsFileName}`,
                  `${instance.itemIds[0]}\n${instance.itemIds[1]}`,
                );
              });
          });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C446017 Verify "Holdings (Location, Call number)" column can be selected for item records (firebird)',
      { tags: ['criticalPath', 'firebird', 'C446017'] },
      () => {
        const identifier = 'Item UUIDs';

        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(identifier);
        BulkEditSearchPane.verifyAfterChoosingIdentifier(identifier);

        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(...instance.itemHrids);
        BulkEditActions.openActions();

        const columnName = 'Holdings (Location, Call number)';

        BulkEditSearchPane.changeShowColumnCheckbox(columnName);
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyResultColumnTitles(columnName);

        const holdingsLocationCallNumber = [
          `${instance.defaultLocation.name} > `,
          `${instance.defaultLocation.name} > ${callNumber}`,
        ];

        holdingsLocationCallNumber.forEach((holdingLocationCallNumber, index) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instance.itemHrids[index],
            columnName,
            holdingLocationCallNumber,
          );
        });

        const headersInCsvToCheck =
          'Item UUID,"Instance (Title, Publisher, Publication date)","Holdings (Location, Call number)"';

        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [headersInCsvToCheck]);

        instance.itemIds.forEach((itemId) => {
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            itemId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            itemId,
          );
        });

        const newPermanentLoanType = 'Reading room';

        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillPermanentLoanType(newPermanentLoanType);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(2, instance.defaultLocation.name);

        [0, 1].forEach((row) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
            'Permanent loan type',
            newPermanentLoanType,
            row,
          );
        });

        holdingsLocationCallNumber.forEach((holdingLocationCallNumber, index) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            instance.itemHrids[index],
            columnName,
            holdingLocationCallNumber,
          );
        });

        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyCSVFileRowsValueIncludes(matchedRecordsFileName, instance.itemIds);
        BulkEditFiles.verifyCSVFileRowsValueIncludes(previewFileName, [
          newPermanentLoanType,
          newPermanentLoanType,
        ]);
        ExportFile.verifyFileIncludes(previewFileName, [headersInCsvToCheck]);

        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyLocationChanges(2, newPermanentLoanType);

        holdingsLocationCallNumber.forEach((holdingLocationCallNumber, index) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            instance.itemHrids[index],
            columnName,
            holdingLocationCallNumber,
          );
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyCSVFileRowsValueIncludes(changedRecordsFileName, [
          newPermanentLoanType,
          newPermanentLoanType,
        ]);
        ExportFile.verifyFileIncludes(changedRecordsFileName, [headersInCsvToCheck]);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();

        instance.itemIds.forEach((itemId) => {
          InventorySearchAndFilter.searchByParameter('Item UUID', itemId);
          ItemRecordView.waitLoading();
          ItemRecordView.verifyPermanentLoanType(newPermanentLoanType);
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.resetAll();
        });
      },
    );
  });
});
