import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  instanceIdentifiers,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
let instanceTypeId;
let instanceTypeName;
const numberOfRecords = 10;
const createdInstanceTitles = [];
const invalidInstanceIds = [];
const createdInstanceIds = [];
const createdInstanceHrids = [];
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName, true);
const errorsFromMatchingFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  instanceUUIDsFileName,
  true,
);

// generate instance titles and invalid instance ids
for (let i = 1; i <= numberOfRecords; i++) {
  createdInstanceTitles.push(`C423684 instance ${i} ${getRandomPostfix()}`);
  invalidInstanceIds.push(uuid());
}

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
            instanceTypeName = instanceTypeData[0].name;
          })
          .then(() => {
            createdInstanceTitles.forEach((instanceTitle) => {
              cy.createInstance({
                instance: {
                  instanceTypeId,
                  title: instanceTitle,
                },
              }).then((instanceId) => {
                createdInstanceIds.push(instanceId);
                cy.wait(1000);
              });
            });
          })
          .then(() => {
            createdInstanceIds.forEach((instanceId) => {
              cy.getInstanceById(instanceId).then((instanceData) => {
                createdInstanceHrids.push(instanceData.hrid);
                cy.wait(500);
              });
            });
          })
          .then(() => {
            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              `${createdInstanceIds.join('\n')}\n${invalidInstanceIds.join('\n')}`,
            );
          });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      createdInstanceIds.forEach((instanceId) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName, errorsFromMatchingFileName);
    });

    it(
      'C736703 Verify "Preview of record matched" in case of uploading valid and invalid Instance identifiers (firebird)',
      { tags: ['criticalPath', 'firebird', 'C736703'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.verifyRecordIdentifiers(instanceIdentifiers);
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount(`${numberOfRecords} instance`);
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

        createdInstanceHrids.forEach((instanceHrid, index) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            createdInstanceTitles[index],
          );
        });

        BulkEditSearchPane.verifyErrorLabel(10);

        invalidInstanceIds.forEach((invalidInstanceId) => {
          BulkEditSearchPane.verifyNonMatchedResults(invalidInstanceId);
        });

        createdInstanceHrids.forEach((instanceHrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instanceHrid,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
            instanceTypeName,
          );
        });

        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(true, true);
        BulkEditSearchPane.verifyInstanceActionShowColumns();
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
        );

        createdInstanceHrids.forEach((instanceHrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instanceHrid,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
            '',
          );
        });

        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
        );

        createdInstanceHrids.forEach((instanceHrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instanceHrid,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
            '',
          );
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        createdInstanceIds.forEach((instanceId) => {
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [instanceId]);
        });

        BulkEditActions.downloadErrors();

        invalidInstanceIds.forEach((invalidInstanceId) => {
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [invalidInstanceId]);
        });
      },
    );
  });
});
