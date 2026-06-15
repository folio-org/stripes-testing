import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';

// TODO: optimize creation of holdings

let user;
let instanceHRID;
const locations = {};
const instanceHRIDFileName = `instanceHRIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceHRIDFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceHRIDFileName);
const item = {
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

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instance.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          instance.holdingTypeId = res[0].id;
        });

        Locations.getViaApiAnyDefault(2).then((loc) => {
          locations.temporaryLocationId = loc[0].id;
          locations.temporaryName = loc[0].name;
          locations.permanentLocationId = loc[1].id;
          locations.permanentName = loc[1].name;
        });

        cy.then(() => {
          // Creating  instance
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instance.instanceTypeId,
              title: instance.title,
            },
            holdings: [
              {
                holdingsTypeId: instance.holdingTypeId,
                permanentLocationId: locations.permanentLocationId,
                temporaryLocationId: locations.temporaryLocationId,
              },
            ],
          }).then((specialInstanceIds) => {
            instance.id = specialInstanceIds.instanceId;

            cy.getInstanceById(instance.id).then((res) => {
              instance.hrid = res.hrid;

              FileManager.createFile(`cypress/fixtures/${instanceHRIDFileName}`, instance.hrid);
            });

            cy.getHoldings({
              limit: 1,
              query: `"instanceId"="${instance.id}"`,
            }).then((holdings) => {
              item.holdingHRID = holdings[0].hrid;
            });

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.wait(5000);
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InventoryInstance.createHoldingsRecordForTemporaryLocation(
              locations.temporaryName,
              locations.temporaryName,
            );
            InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
              instanceHRID = initialInstanceHrId;
            });
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          });
        });
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
          [locations.temporaryName, locations.temporaryName],
          'temporaryLocation',
          true,
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();
        BulkEditSearchPane.verifyBulkEditImage();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceHRIDFileName);

        const newLocation = locations.temporaryName;

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
          ERROR_MESSAGES.NO_CHANGE_REQUIRED,
          'Warning',
        );
      },
    );
  });
});
