import permissions from '../../../../support/dictionary/permissions';
import testTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import FileManager from '../../../../support/utils/fileManager';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

let user;
const invalidInstanceHRID = `123-${getRandomPostfix()}`;
const validAndInvalidInstanceHRIDsFileName = `validAndInvalidInstanceHRIDS-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${validAndInvalidInstanceHRIDsFileName}`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${validAndInvalidInstanceHRIDsFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${validAndInvalidInstanceHRIDsFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${validAndInvalidInstanceHRIDsFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${validAndInvalidInstanceHRIDsFileName}`;

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
          instance.defaultLocation = Location.getDefaultLocation(servicePoint.id);
          instance2.defaultLocation = Location.getDefaultLocation(servicePoint2.id);
          Location.createViaApi(instance.defaultLocation);
          Location.createViaApi(instance2.defaultLocation);
          ServicePoints.getViaApi({ limit: 2 }).then((servicePoints) => {
            instance.servicepointId = servicePoints[0].id;
            instance2.servicepointId = servicePoints[1].id;
          });
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
                  // Getting both instance hrids and putting them into a file alongside with invalid one
                  cy.getInstanceById(instance.id).then((res) => {
                    instance.hrid = res.hrid;
                  });
                  cy.getInstanceById(instance2.id)
                    .then((res) => {
                      instance2.hrid = res.hrid;
                    })
                    .then(() => {
                      FileManager.createFile(
                        `cypress/fixtures/${validAndInvalidInstanceHRIDsFileName}`,
                        `${instance.hrid}\n${instance2.hrid}\n${invalidInstanceHRID}`,
                      );
                    });
                });
            });
        });
    });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item2.barcode);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${validAndInvalidInstanceHRIDsFileName}`);
    FileManager.deleteFileFromDownloadsByMask(
      validAndInvalidInstanceHRIDsFileName,
      `*${matchedRecordsFileName}`,
      previewOfProposedChangesFileName,
      updatedRecordsFileName,
      errorsFromCommittingFileName,
      errorsFromMatchingFileName,
    );
  });

  it(
    'C375298 Verify generated Logs files for Holdings In app -- valid and invalid records (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      BulkEditSearchPane.checkHoldingsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');

      BulkEditSearchPane.uploadFile(validAndInvalidInstanceHRIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.downloadMatchedResults();
      BulkEditActions.downloadErrors();
      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.clearTemporaryLocation('holdings', 0);
      BulkEditActions.addNewBulkEditFilterString();
      BulkEditActions.replacePermanentLocation(instance.defaultLocation.name, 'holdings', 1);

      BulkEditActions.confirmChanges();
      BulkEditActions.downloadPreview();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();
      BulkEditActions.downloadErrors();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.checkHoldingsCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);
      BulkEditSearchPane.verifyLogsRowActionWhenCompletedWithErrors();

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(validAndInvalidInstanceHRIDsFileName, [
        instance.hrid,
        instance2.hrid,
        invalidInstanceHRID,
      ]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileName}`,
        [instance.hrid, instance2.hrid],
        'instanceHrid',
        true,
      );

      BulkEditSearchPane.downloadFileWithErrorsEncountered();
      BulkEditFiles.verifyMatchedResultFileContent(
        errorsFromMatchingFileName,
        [invalidInstanceHRID],
        'firstElement',
        false,
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        ['', ''],
        'temporaryLocation',
        true,
      );
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        [instance.defaultLocation.name, instance.defaultLocation.name],
        'permanentLocation',
        true,
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        ['', ''],
        'temporaryLocation',
        true,
      );
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [instance.defaultLocation.name],
        'permanentLocation',
        true,
      );

      BulkEditSearchPane.downloadFileWithCommitErrors();
      BulkEditFiles.verifyMatchedResultFileContent(
        errorsFromCommittingFileName,
        [instance.hrid],
        'firstElement',
        false,
      );

      // Go to inventory app and verify changes
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.searchByParameter('Instance HRID', instance.hrid);
      InventorySearchAndFilter.selectSearchResultItem();
      InventorySearchAndFilter.selectViewHoldings();
      InventoryInstance.verifyHoldingsPermanentLocation(instance.defaultLocation.name);
      InventoryInstance.verifyHoldingsTemporaryLocation('-');
      InventoryInstance.closeHoldingsView();

      InventorySearchAndFilter.searchByParameter('Instance HRID', instance2.hrid);
      InventorySearchAndFilter.selectSearchResultItem();
      InventorySearchAndFilter.selectViewHoldings();
      InventoryInstance.verifyHoldingsPermanentLocation(instance.defaultLocation.name);
      InventoryInstance.verifyHoldingsTemporaryLocation('-');
    },
  );
});
