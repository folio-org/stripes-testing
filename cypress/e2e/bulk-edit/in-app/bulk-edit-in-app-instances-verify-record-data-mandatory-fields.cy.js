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
const instance = {
  title: `AT_C423674_FolioInstance_${getRandomPostfix()}`,
};
const staffSuppressOption = 'Staff suppress';
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);

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
      'C423674 Verify rendering Instance record data in bulk edit forms and files (mandatory fields only) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423674'] },
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
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            value: instance.id,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            value: 'false',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            value: 'false',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREVIOUSLY_HELD,
            value: 'false',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
            value: 'false',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            value: instance.hrid,
          },
          { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE, value: 'FOLIO' },
          { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CATALOGED_DATE, value: '' },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.MODE_OF_ISSUANCE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            value: instance.title,
          },
          { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INDEX_TITLE, value: '' },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
            value: '',
          },
          { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS, value: '' },
          { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION, value: '' },
          { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EDITION, value: '' },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PHYSICAL_DESCRIPTION,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
            value: instanceTypeName,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.NATURE_OF_CONTENT,
            value: '',
          },
          { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS, value: '' },
          { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES, value: '' },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_FREQUENCY,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_RANGE,
            value: '',
          },
        ];

        BulkEditActions.openActions();

        checkedColumnHeadersWithValues.forEach(({ header }) => {
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(header);
        });

        cy.wait(1000);
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();

        checkedColumnHeadersWithValues.forEach(({ header, value }) => {
          BulkEditSearchPane.verifyResultsUnderColumns(header, value);
        });

        const checkedColumnHeaders = checkedColumnHeadersWithValues.map(
          (headerValuePair) => headerValuePair.header,
        );

        BulkEditSearchPane.verifyColumnsInTableInExactOrder(checkedColumnHeaders);
        BulkEditActions.openActions();

        const stringOfHeaders = checkedColumnHeaders.join(',');
        const stringOfValues = checkedColumnHeadersWithValues
          .map((checkedColumnHeader) => checkedColumnHeader.value)
          .join(',');

        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [stringOfHeaders, stringOfValues]);
        BulkEditActions.openStartBulkEditFolioInstanceForm();
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
          if (item.header === BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS) {
            item.value = 'true';
          }
          return item;
        });
        const stringOfEditedValues = checkedColumnHeadersWithEditedValues
          .map((checkedColumnHeadersWithEditedValue) => checkedColumnHeadersWithEditedValue.value)
          .join(',');

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          instance.id,
          checkedColumnHeadersWithEditedValues,
        );
        BulkEditSearchPane.verifyColumnsInAreYouSureFormInExactOrder(checkedColumnHeaders);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [stringOfHeaders, stringOfEditedValues]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyPaneRecordsChangedCount('1 instance');
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          'true',
        );
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          instance.id,
          checkedColumnHeadersWithEditedValues,
        );
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
