import getRandomPostfix from '../../../../support/utils/stringTools';
import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import devTeams from '../../../../support/dictionary/devTeams';
import testTypes from '../../../../support/dictionary/testTypes';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

let user;
let tempLocation;
let tempLocation2;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${itemBarcodesFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${itemBarcodesFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${itemBarcodesFileName}`;

const item = {
  barcode: `456-${getRandomPostfix()}`,
};
const item2 = {
  barcode: `789-${getRandomPostfix()}`,
};
const instance = {
  id: '',
  hrid: '',
  title: `autotestName_${getRandomPostfix()}`,
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  instanceTypeId: '',
  holdingTypeId: '',
  loanTypeId: '',
  materialTypeId: '',
  materialType: '',
  defaultLocation: '',
};
const instance2 = {
  id: '',
  hrid: '',
  title: `autotestName2_${getRandomPostfix()}`,
  instanceName: `testBulkEdit2_${getRandomPostfix()}`,
  instanceTypeId: '',
  holdingTypeId: '',
  loanTypeId: '',
  materialTypeId: '',
  materialType: '',
  defaultLocation: '',
};

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });

      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 2 }).then((instanceTypes) => {
            instance.instanceTypeId = instanceTypes[0].id;
            instance2.instanceTypeId = instanceTypes[1].id;
          });
          cy.getHoldingTypes({ limit: 2 }).then((res) => {
            instance.holdingTypeId = res[0].id;
            instance2.holdingTypeId = res[1].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            instance.locationId = res.id;
            instance2.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 2 }).then((res) => {
            instance.loanTypeId = res[0].id;
            instance2.loanTypeId = res[1].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            instance.materialTypeId = res.id;
            instance2.materialTypeId = res.id;
          });
          const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
          const servicePoint2 = ServicePoints.getDefaultServicePointWithPickUpLocation();
          tempLocation = ServicePoints.getDefaultServicePointWithPickUpLocation();
          tempLocation2 = ServicePoints.getDefaultServicePointWithPickUpLocation();
          instance.defaultLocation = Location.getDefaultLocation(servicePoint.id);
          instance2.defaultLocation = Location.getDefaultLocation(servicePoint2.id);
          tempLocation = Location.getDefaultLocation(tempLocation.id);
          tempLocation2 = Location.getDefaultLocation(tempLocation2.id);
          [
            instance.defaultLocation,
            instance2.defaultLocation,
            tempLocation,
            tempLocation2,
          ].forEach((location) => Location.createViaApi(location));
        })
        .then(() => {
          // Creating first instance
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instance.instanceTypeId,
              title: instance.title,
            },
            holdings: [
              {
                holdingsTypeId: instance.holdingTypeId,
                permanentLocationId: instance.defaultLocation.id,
                temporaryLocationId: tempLocation.id,
              },
            ],
            items: [
              {
                barcode: item.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: instance.loanTypeId },
                materialType: { id: instance.materialTypeId },
              },
            ],
          })
            .then((specialInstanceIds) => {
              instance.id = specialInstanceIds.instanceId;
            })
            // Creating second instance
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instance2.instanceTypeId,
                  title: instance2.title,
                },
                holdings: [
                  {
                    holdingsTypeId: instance2.holdingTypeId,
                    permanentLocationId: instance2.defaultLocation.id,
                    temporaryLocationId: tempLocation2.id,
                  },
                ],
                items: [
                  {
                    barcode: item2.barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: instance2.loanTypeId },
                    materialType: { id: instance2.materialTypeId },
                  },
                ],
              })
                .then((specialInstanceIds) => {
                  instance2.id = specialInstanceIds.instanceId;
                })
                .then(() => {
                  FileManager.createFile(
                    `cypress/fixtures/${itemBarcodesFileName}`,
                    `${item.barcode}\n${item2.barcode}`,
                  );
                });
            });
        });
    });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item2.barcode);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    FileManager.deleteFileFromDownloadsByMask(
      itemBarcodesFileName,
      `*${matchedRecordsFileName}`,
      previewOfProposedChangesFileName,
      updatedRecordsFileName,
    );
  });

  it(
    'C375300 Verify generated Logs files for Holdings In app -- only valid Item barcodes (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDragNDropHoldingsItemBarcodesArea();
      BulkEditSearchPane.uploadFile(itemBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.downloadMatchedResults();
      BulkEditSearchPane.changeShowColumnCheckbox('Instance (Title, Publisher, Publication date)');
      BulkEditSearchPane.verifyResultColumTitles('Instance (Title, Publisher, Publication date)');

      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.replaceTemporaryLocation(tempLocation.name, 'holdings', 0);
      BulkEditActions.addNewBulkEditFilterString();
      BulkEditActions.replacePermanentLocation('Online (E)', 'holdings', 1);

      BulkEditActions.confirmChanges();
      BulkEditActions.downloadPreview();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.checkHoldingsCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);
      BulkEditSearchPane.verifyLogsRowActionWhenCompleted();

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(itemBarcodesFileName, [item.barcode, item2.barcode]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileName}`,
        [item.barcode, item2.barcode],
        'holdingsItemBarcode',
        true,
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        [tempLocation.name, tempLocation.name],
        'temporaryLocation',
        true,
      );
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        ['Online', 'Online'],
        'permanentLocation',
        true,
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [tempLocation.name, tempLocation.name],
        'temporaryLocation',
        true,
      );
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        ['Online', 'Online'],
        'permanentLocation',
        true,
      );

      // Go to inventory app and verify changes
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
      ItemRecordView.closeDetailView();
      InventorySearchAndFilter.selectSearchResultItem();
      InventorySearchAndFilter.selectViewHoldings();
      InventoryInstance.verifyHoldingsPermanentLocation('Online');
      InventoryInstance.verifyHoldingsTemporaryLocation(tempLocation.name);
      InventoryInstance.closeHoldingsView();

      InventorySearchAndFilter.searchByParameter('Barcode', item2.barcode);
      ItemRecordView.closeDetailView();
      InventorySearchAndFilter.selectSearchResultItem();
      InventorySearchAndFilter.selectViewHoldings();
      InventoryInstance.verifyHoldingsPermanentLocation('Online');
      InventoryInstance.verifyHoldingsTemporaryLocation(tempLocation.name);
    },
  );
});
