import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
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
const instance = {
  title: `C423674 instance-${getRandomPostfix()}`,
};
const staffSuppressOption = 'Staff suppress';
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${instanceUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${instanceUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${instanceUUIDsFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 })
          .then((res) => {
            instanceTypeId = res[0].id;
            instanceTypeName = res[0].name;
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId,
                title: instance.title,
              },
            }).then((specialInstanceId) => {
              instance.id = specialInstanceId;
            });
          })
          .then(() => {
            cy.getInstanceById(instance.id).then((instanceData) => {
              instance.hrid = instanceData.hrid;
            });
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, instance.id);
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
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C655288 Verify rendering Instance record data in bulk edit forms and files (mandatory fields only) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C655288'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.verifyRecordIdentifiers(instanceIdentifiers);
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
          instance.title,
        );

        const checkedColumnHeadersWithValues = [
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID, instance.id],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY, 'false'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS, 'false'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREVIOUSLY_HELD, 'false'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID, instance.hrid],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE, 'FOLIO'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CATALOGED_DATE, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.MODE_OF_ISSUANCE, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE, instance.title],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INDEX_TITLE, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EDITION, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PHYSICAL_DESCRIPTION, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE, instanceTypeName],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.NATURE_OF_CONTENT, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_FREQUENCY, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_RANGE, ''],
        ];
        const checkedColumnHeaders = checkedColumnHeadersWithValues.map(
          (headerValuePair) => headerValuePair[0],
        );

        BulkEditActions.openActions();

        checkedColumnHeadersWithValues.forEach((checkedColumnHeader) => {
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(checkedColumnHeader[0]);
        });

        cy.wait(1000);
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();

        checkedColumnHeadersWithValues.forEach((checkedColumnHeaderWithValue) => {
          BulkEditSearchPane.verifyResultsUnderColumns(...checkedColumnHeaderWithValue);
        });

        BulkEditSearchPane.verifyColumnsInTableInExactOrder(checkedColumnHeaders);
        BulkEditActions.openActions();

        const stringOfHeaders = checkedColumnHeaders.join(',');
        const stringOfValues = checkedColumnHeadersWithValues
          .map((headerValuePair) => headerValuePair[1])
          .join(',');

        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [stringOfHeaders, stringOfValues]);
        BulkEditActions.openStartBulkEditInstanceForm();
        BulkEditActions.selectOption(staffSuppressOption);
        BulkEditSearchPane.verifyInputLabel(staffSuppressOption);
        BulkEditActions.selectSecondAction('Set true');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          'true',
        );

        const checkedColumnHeadersWithEditedValues = checkedColumnHeadersWithValues.map((item) => {
          if (item[0] === BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS) {
            return [item[0], 'true'];
          }
          return item;
        });
        const stringOfEditedValues = checkedColumnHeadersWithEditedValues
          .map((headerValuePair) => headerValuePair[1])
          .join(',');

        checkedColumnHeadersWithEditedValues.forEach((checkedColumnHeaderWithEditedValue) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
            ...checkedColumnHeaderWithEditedValue,
          );
        });

        BulkEditSearchPane.verifyColumnsInAreYouSureFormInExactOrder(checkedColumnHeaders);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [stringOfHeaders, stringOfEditedValues]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyPaneRecordsChangedCount(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          'true',
        );

        checkedColumnHeadersWithEditedValues.forEach((checkedColumnHeaderWithEditedValue) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRowInPreviewRecordsChanged(
            ...checkedColumnHeaderWithEditedValue,
          );
        });

        BulkEditSearchPane.verifyColumnsInTableInExactOrder(checkedColumnHeaders);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          stringOfHeaders,
          stringOfEditedValues,
        ]);
      },
    );
  });
});
