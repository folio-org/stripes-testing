import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
const firstInstance = {
  title: `C476785 first instance-${getRandomPostfix()}`,
};
const secondInstance = {
  title: `C476785 second instance-${getRandomPostfix()}`,
};
const recordIdentifier = 'Instance HRIDs';
const errorText = 'Duplicate entry';
const firstInstanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const secondInstanceHRIDsFileName = `instanceHRIDs-${getRandomPostfix()}.csv`;
const firstMatchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(
  firstInstanceUUIDsFileName,
);
const secondMatchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(
  secondInstanceHRIDsFileName,
);
const errorsFromMatchingFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  secondInstanceHRIDsFileName,
);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: firstInstance.title,
                },
              });
            })
            .then((instanceData) => {
              firstInstance.uuid = instanceData.instanceId;
            })
            .then(() => {
              cy.getInstanceById(firstInstance.uuid).then((res) => {
                firstInstance.hrid = res.hrid;
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: secondInstance.title,
                },
              });
            })
            .then((instanceData) => {
              secondInstance.uuid = instanceData.instanceId;
            })
            .then(() => {
              cy.getInstanceById(secondInstance.uuid).then((res) => {
                secondInstance.hrid = res.hrid;
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${firstInstanceUUIDsFileName}`,
                firstInstance.uuid,
              );
              FileManager.createFile(
                `cypress/fixtures/${secondInstanceHRIDsFileName}`,
                `${secondInstance.hrid}\r\n${secondInstance.hrid}`,
              );
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(firstInstance.uuid);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(secondInstance.uuid);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${firstInstanceUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${secondInstanceHRIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          firstMatchedRecordsFileName,
          secondMatchedRecordsFileName,
          errorsFromMatchingFileName,
        );
      });

      it(
        'C476785 Identifier - Verify "Preview of record matched" when uploading valid Instance identifiers in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C476785'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(firstInstanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(firstInstanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(firstInstanceUUIDsFileName);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            firstInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            firstInstance.hrid,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            firstInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            firstInstance.title,
          );
          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();
          BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
          BulkEditSearchPane.verifySearchColumnNameTextFieldExists();
          BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();
          BulkEditFiles.verifyValueInRowByUUID(
            firstMatchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            firstInstance.uuid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            firstInstance.title,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            firstMatchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            firstInstance.uuid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            firstInstance.hrid,
          );

          BulkEditSearchPane.selectRecordIdentifier(recordIdentifier);
          BulkEditSearchPane.verifyAfterChoosingIdentifier(recordIdentifier);
          cy.wait(2000);
          BulkEditSearchPane.uploadFile(secondInstanceHRIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(secondInstanceHRIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(secondInstanceHRIDsFileName);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            secondInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            secondInstance.hrid,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            secondInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            secondInstance.title,
          );
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);
          BulkEditSearchPane.verifyErrorLabel(0, 1);
          BulkEditSearchPane.verifyErrorByIdentifier(secondInstance.hrid, errorText, 'Warning');
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
          BulkEditActions.downloadMatchedResults();
          BulkEditFiles.verifyValueInRowByUUID(
            secondMatchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            secondInstance.uuid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            secondInstance.title,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            secondMatchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            secondInstance.uuid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            secondInstance.hrid,
          );
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [
            `WARNING,${secondInstance.hrid},${errorText}`,
          ]);
        },
      );
    });
  });
});
