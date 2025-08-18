import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, HOLDING_NOTE_TYPES } from '../../../support/constants';

let user;
let actionNoteTypeId;
let instances;
let holdingsHRIDs;
let holdingsHRIDFileName;
let matchedRecordsFileName;
let changedRecordsFileName;
let previewFileName;
const holdingsNote = 'Line-1\nLine-2\nLine-3\nLine-4';

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('In-app approach', () => {
      beforeEach('create test data', () => {
        instances = [];
        holdingsHRIDs = [];
        holdingsHRIDFileName = `holdingsHRID_${getRandomPostfix()}.csv`;
        matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingsHRIDFileName);
        changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingsHRIDFileName);
        previewFileName = BulkEditFiles.getPreviewFileName(holdingsHRIDFileName);

        for (let i = 0; i < 3; i++) {
          instances.push({
            instanceName: `AT_C399093_FolioInstance_${getRandomPostfix()}`,
            itemBarcode: getRandomPostfix(),
            instanceId: '',
          });
        }

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          instances.forEach((instance) => {
            instance.instanceId = InventoryInstances.createInstanceViaApi(
              instance.instanceName,
              instance.itemBarcode,
            );
            cy.getHoldings({ limit: 1, query: `"instanceId"="${instance.instanceId}"` }).then(
              (holdings) => {
                cy.getHoldingNoteTypeIdViaAPI(HOLDING_NOTE_TYPES.ACTION_NOTE).then(
                  (holdingNoteTypeId) => {
                    actionNoteTypeId = holdingNoteTypeId;

                    holdingsHRIDs.push(holdings[0].hrid);
                    cy.updateHoldingRecord(holdings[0].id, {
                      ...holdings[0],
                      notes: [
                        {
                          holdingsNoteTypeId: actionNoteTypeId,
                          note: holdingsNote,
                          staffOnly: false,
                        },
                      ],
                    });
                  },
                );

                FileManager.appendFile(
                  `cypress/fixtures/${holdingsHRIDFileName}`,
                  `${holdings[0].hrid}\n`,
                );
              },
            );
          });
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        instances.forEach((item) => {
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
        });
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          changedRecordsFileName,
          previewFileName,
        );
      });

      it(
        'C399093 Verify Previews for the number of Holdings records if the records have fields with line breaks (firebird)',
        { tags: ['criticalPath', 'firebird', 'C399093'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');
          BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
          BulkEditSearchPane.waitFileUploading();

          BulkEditSearchPane.verifyMatchedResults(...holdingsHRIDs);
          BulkEditActions.downloadMatchedResults();
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [holdingsNote]);
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Action note');
          BulkEditSearchPane.verifySpecificItemsMatched(holdingsNote);

          const location = 'Online';
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.replaceTemporaryLocation(location, 'holdings');

          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(holdingsHRIDs.length, location);
          BulkEditActions.downloadPreview();
          ExportFile.verifyFileIncludes(previewFileName, [holdingsNote]);
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          ExportFile.verifyFileIncludes(changedRecordsFileName, [holdingsNote]);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          instances.forEach((item) => {
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.byKeywords(item.instanceName);
            InventoryInstance.waitInventoryLoading();
            InventoryInstance.openHoldingView();
            InventoryInstance.verifyHoldingsTemporaryLocation(location);
            InventoryInstance.closeHoldingsView();
          });
        },
      );
    });
  },
);
