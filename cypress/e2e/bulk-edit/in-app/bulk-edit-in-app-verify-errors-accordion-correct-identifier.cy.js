import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import { APPLICATION_NAMES, LOCATION_IDS } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

// TODO: optimize creation of holdings

let user;
let tempLocation;
let instanceHRID;
const instanceHRIDFileName = `instanceHRIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceHRIDFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceHRIDFileName);

const item = {
  annexId: LOCATION_IDS.ANNEX,
  itemBarcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};

const instance = {
  title: `autotestName_${getRandomPostfix()}`,
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.inventoryAll.gui,
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
            const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
            instance.defaultLocation = Location.getDefaultLocation(servicePoint.id);
            tempLocation = ServicePoints.getDefaultServicePointWithPickUpLocation();
            tempLocation = Location.getDefaultLocation(tempLocation.id);
            [instance.defaultLocation, tempLocation].forEach((location) => Location.createViaApi(location));
          })
          .then(() => {
            // Creating  instance
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instance.instanceTypeId,
                title: instance.title,
              },
              holdings: [
                {
                  holdingsTypeId: instance.holdingTypeId,
                  permanentLocationId: instance.defaultLocation.id,
                  temporaryLocationId: LOCATION_IDS.ANNEX,
                },
              ],
            })
              .then((specialInstanceIds) => {
                instance.id = specialInstanceIds.instanceId;
              })
              .then(() => {
                cy.getInstanceById(instance.id)
                  .then((res) => {
                    instance.hrid = res.hrid;
                  })
                  .then(() => {
                    FileManager.createFile(
                      `cypress/fixtures/${instanceHRIDFileName}`,
                      instance.hrid,
                    );
                  });
              })
              .then(() => {
                cy.getHoldings({
                  limit: 1,
                  query: `"instanceId"="${instance.id}"`,
                }).then((holdings) => {
                  item.holdingHRID = holdings[0].hrid;
                });
              });
          });
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.searchInstanceByTitle(instance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.createHoldingsRecordForTemporaryLocation();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;
        });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName, previewFileName);
    });

    it(
      'C369050 Verify that Errors accordion displays correct identifier on the confirmation screen (instance HRIDs) (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C369050'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Instance HRIDs');

        BulkEditSearchPane.uploadFile(instanceHRIDFileName);
        BulkEditSearchPane.checkForUploading(instanceHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneRecordsCount('2 holdings');

        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyMatchedResultFileContent(
          matchedRecordsFileName,
          ['Annex', 'Annex'],
          'temporaryLocation',
          true,
        );
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();
        BulkEditSearchPane.verifyBulkEditImage();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceHRIDFileName);

        const newLocation = 'Annex';
        BulkEditActions.selectOption('Temporary holdings location');
        BulkEditActions.selectAction('Replace with');
        BulkEditActions.clickSelectedLocation('Select location', newLocation);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(2, newLocation);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [newLocation]);
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(0);
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
        BulkEditSearchPane.verifyErrorByIdentifier(
          instanceHRID,
          'No change in value required',
          'Warning',
        );
      },
    );
  });
});
