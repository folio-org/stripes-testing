import TopMenu from '../../../../support/fragments/topMenu';
import testTypes from '../../../../support/dictionary/testTypes';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../../support/dictionary/devTeams';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

let user;
const itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileNameInvalidAndValid = `Matched-Records-${itemHRIDsFileName}`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${itemHRIDsFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${itemHRIDsFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${itemHRIDsFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${itemHRIDsFileName}`;

const invalidItemHRID = getRandomPostfix();
const instance = {
  id: '',
  title: `autotestName_${getRandomPostfix()}`,
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  instanceTypeId: '',
  holdingTypeId: '',
  loanTypeId: '',
  materialTypeId: '',
  materialType: '',
  defaultLocation: '',
};
const item1 = {
  barcode: getRandomPostfix(),
  hrid: '',
  id: '',
};
const item2 = {
  barcode: getRandomPostfix(),
  hrid: '',
  id: '',
};

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.bulkEditLogsView.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });

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
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            instance.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            instance.materialTypeId = res.id;
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
            ],
            items: [
              {
                barcode: item1.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: instance.loanTypeId },
                materialType: { id: instance.materialTypeId },
              },
              {
                barcode: item2.barcode,
                status: { name: 'Missing' },
                permanentLoanType: { id: instance.loanTypeId },
                materialType: { id: instance.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            instance.id = specialInstanceIds.instanceId;
          });
        });
      cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item1.barcode}"` }).then(
        (res) => {
          item1.hrid = res.hrid;
          item1.id = res.id;
        },
      );
      cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item2.barcode}"` }).then(
        (res) => {
          item2.hrid = res.hrid;
          item2.id = res.id;
          FileManager.createFile(
            `cypress/fixtures/${itemHRIDsFileName}`,
            `${item1.hrid}\n${item2.hrid}\n${invalidItemHRID}`,
          );
        },
      );
    });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item1.barcode);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
    FileManager.deleteFileFromDownloadsByMask(
      itemHRIDsFileName,
      `*${matchedRecordsFileNameInvalidAndValid}`,
      previewOfProposedChangesFileName,
      updatedRecordsFileName,
      errorsFromCommittingFileName,
      errorsFromMatchingFileName,
    );
  });

  it(
    'C375281 Verify generated Logs files for Items In app -- valid and invalid records (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');

      BulkEditSearchPane.uploadFile(itemHRIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.downloadMatchedResults();
      BulkEditActions.downloadErrors();

      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.clearPermanentLocation('item', 0);
      BulkEditActions.addNewBulkEditFilterString();
      BulkEditActions.replaceItemStatus('Missing', 1);
      BulkEditActions.addNewBulkEditFilterString();
      BulkEditActions.clearTemporaryLoanType(2);
      BulkEditActions.confirmChanges();
      BulkEditActions.downloadPreview();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();
      BulkEditActions.downloadErrors();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.checkItemsCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);
      BulkEditSearchPane.verifyLogsRowActionWhenCompletedWithErrors();

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(itemHRIDsFileName, [item1.hrid, item2.hrid, invalidItemHRID]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileNameInvalidAndValid}`,
        [item1.hrid, item2.hrid],
        'hrid',
        true,
      );

      BulkEditSearchPane.downloadFileWithErrorsEncountered();
      BulkEditFiles.verifyMatchedResultFileContent(
        errorsFromMatchingFileName,
        [invalidItemHRID],
        'firstElement',
        false,
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        [item1.id, item2.id],
        'firstElement',
        true,
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [item1.id, item2.id],
        'firstElement',
        true,
      );

      BulkEditSearchPane.downloadFileWithCommitErrors();
      BulkEditFiles.verifyMatchedResultFileContent(
        errorsFromCommittingFileName,
        [item2.hrid],
        'firstElement',
        false,
      );

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', item1.barcode);
      ItemRecordView.waitLoading();
      ItemRecordView.closeDetailView();
      InventoryInstance.openHoldings(['']);
      InventoryInstance.verifyCellsContent('Missing');
    },
  );
});
