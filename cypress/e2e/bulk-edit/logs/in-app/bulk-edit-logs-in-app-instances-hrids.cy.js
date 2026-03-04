import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import SelectInstanceModal from '../../../../support/fragments/requests/selectInstanceModal';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import { APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let hridValues;
let instanceHRIDFileName;
let matchedRecordsFileName;
let previewFileName;
let errorsFromCommittingFileName;
let folioItem;
let marcInstance;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Logs', () => {
      describe('In-app approach', () => {
        beforeEach('create test data', () => {
          hridValues = {};
          instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
          matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceHRIDFileName);
          previewFileName = BulkEditFiles.getPreviewFileName(instanceHRIDFileName);
          errorsFromCommittingFileName =
            BulkEditFiles.getErrorsFromCommittingFileName(instanceHRIDFileName);
          folioItem = {
            instanceName: `testBulkEdit_${getRandomPostfix()}`,
            itemBarcode: `folioItem${getRandomPostfix()}`,
          };
          marcInstance = {
            title: `AT_C423990_MarcInstance_${getRandomPostfix()}`,
          };

          cy.createTempUser([
            permissions.inventoryAll.gui,
            permissions.enableStaffSuppressFacet.gui,
            permissions.bulkEditView.gui,
            permissions.bulkEditEdit.gui,
            permissions.bulkEditLogsView.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
              marcInstance.instanceId = instanceId;

              cy.getInstanceById(marcInstance.instanceId).then((body) => {
                body.staffSuppress = false;
                cy.updateInstance(body);
              });

              folioItem.instanceId = InventoryInstances.createInstanceViaApi(
                folioItem.instanceName,
                folioItem.itemBarcode,
              );
              cy.getInstance({
                limit: 1,
                expandAll: true,
                query: `"id"=="${folioItem.instanceId}"`,
              }).then((instance) => {
                hridValues.folioHrid = instance.hrid;
                FileManager.createFile(`cypress/fixtures/${instanceHRIDFileName}`, instance.hrid);
              });
              cy.getInstance({
                limit: 1,
                expandAll: true,
                query: `"id"=="${marcInstance.instanceId}"`,
              }).then((instance) => {
                hridValues.marcHrid = instance.hrid;
                FileManager.appendFile(
                  `cypress/fixtures/${instanceHRIDFileName}`,
                  `\n${instance.hrid}\n`,
                );
              });
            });
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
        });

        afterEach('delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioItem.itemBarcode);
          InventoryInstance.deleteInstanceViaApi(marcInstance.instanceId);
          FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
          FileManager.deleteFileFromDownloadsByMask(
            matchedRecordsFileName,
            previewFileName,
            errorsFromCommittingFileName,
          );
        });

        it(
          'C423990 Verify generated Logs files for Instances staff suppress (Set false) (firebird)',
          { tags: ['extendedPath', 'firebird', 'C423990'] },
          () => {
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
              'Instance',
              'Instance HRIDs',
            );
            BulkEditSearchPane.uploadFile(instanceHRIDFileName);
            BulkEditSearchPane.waitFileUploading();

            BulkEditActions.downloadMatchedResults();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Instance UUID');
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Staff suppress');
            BulkEditSearchPane.verifyResultColumnTitles('Staff suppress');
            ExportFile.verifyFileIncludes(matchedRecordsFileName, [
              `${folioItem.instanceId},false,false,`,
              `${marcInstance.instanceId},false,false,`,
            ]);
            BulkEditActions.openStartBulkEditFolioInstanceForm();
            BulkEditActions.verifyModifyLandingPageBeforeModifying();
            BulkEditActions.selectOption('Staff suppress');
            BulkEditSearchPane.verifyInputLabel('Staff suppress');
            BulkEditActions.selectAction('Set false');
            BulkEditActions.verifyCheckboxAbsent();
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyAreYouSureForm(2, folioItem.instanceId);
            BulkEditActions.verifyAreYouSureForm(2, marcInstance.instanceId);
            BulkEditActions.downloadPreview();
            ExportFile.verifyFileIncludes(previewFileName, [
              `${folioItem.instanceId},false,false,`,
              `${marcInstance.instanceId},false,false,`,
            ]);
            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(0);
            BulkEditSearchPane.verifyErrorLabel(0, 2);

            [hridValues.folioHrid, hridValues.marcHrid].forEach((hrid) => {
              BulkEditSearchPane.verifyErrorByIdentifier(
                hrid,
                ERROR_MESSAGES.NO_CHANGE_REQUIRED,
                'Warning',
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadErrors();
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `WARNING,${hridValues.folioHrid},No change in value required`,
              `WARNING,${hridValues.marcHrid},No change in value required`,
            ]);
            FileManager.deleteFileFromDownloadsByMask(
              matchedRecordsFileName,
              previewFileName,
              errorsFromCommittingFileName,
            );

            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.checkInstancesCheckbox();
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWhenNoChangesApplied();

            BulkEditLogs.downloadFileUsedToTrigger();
            ExportFile.verifyFileIncludes(instanceHRIDFileName, [
              hridValues.folioHrid,
              hridValues.marcHrid,
            ]);

            BulkEditLogs.downloadFileWithMatchingRecords();
            ExportFile.verifyFileIncludes(matchedRecordsFileName, [
              `${folioItem.instanceId},false,false,`,
              `${marcInstance.instanceId},false,false,`,
            ]);

            BulkEditLogs.downloadFileWithProposedChanges();
            ExportFile.verifyFileIncludes(previewFileName, [
              `${folioItem.instanceId},false,false,`,
              `${marcInstance.instanceId},false,false,`,
            ]);

            BulkEditLogs.downloadFileWithCommitErrors();
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `WARNING,${hridValues.folioHrid},No change in value required`,
              `WARNING,${hridValues.marcHrid},No change in value required`,
            ]);

            [folioItem.instanceName, marcInstance.title].forEach((title) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              SelectInstanceModal.filterByStaffSuppress('No');
              InventorySearchAndFilter.searchInstanceByTitle(title);
              InventoryInstances.selectInstance();
              InventoryInstance.waitLoading();
              InventoryInstance.verifyNoStaffSuppress();
            });
          },
        );
      });
    });
  },
);
