import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const arabicText = 'هذا اختبار';
const instanceUUIDsFileName = `instanceUUIDs_C651597_${getRandomPostfix()}.csv`;
const instance = {
  title: `C651597_AT_${getRandomPostfix()} ${arabicText}`,
  indexTitle: `${arabicText}_${getRandomPostfix()}`,
};
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);

const arabicColumns = [
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
    value: arabicText,
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INDEX_TITLE,
    value: arabicText,
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
    value: arabicText,
  },
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            instance.instanceTypeId = instanceTypes[0].id;
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: instance.instanceTypeId,
                title: instance.title,
                indexTitle: instance.indexTitle,
                administrativeNotes: [arabicText],
              },
            }).then((instanceId) => {
              instance.id = instanceId;
              FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, instance.id);
            });
          });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instance.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C651597 Verify correct display of Arabic characters in Instance editable text fields in EXCEL .csv files downloaded from Bulk edit (firebird)',
      { tags: ['extendedPath', 'firebird', 'C651597'] },
      () => {
        // Steps 1-3: Upload UUID file and verify matched results
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifySpecificItemsMatched(arabicText);

        // Steps 4-5: Download matched records CSV and verify Arabic text + UTF-8 BOM
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyBomAndArabicColumnsInCsvFile(
          matchedRecordsFileName,
          instance.id,
          arabicColumns,
        );

        // Steps 6-7: Open FOLIO Instances form, set Staff suppress to true
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.selectOption('Staff suppress');
        BulkEditActions.selectAction('Set true');

        // Step 8: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

        // Steps 9-10: Download preview CSV and verify Arabic text + UTF-8 BOM
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyBomAndArabicColumnsInCsvFile(
          previewFileName,
          instance.id,
          arabicColumns,
        );

        // Step 11: Commit changes
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);

        // Steps 12-13: Download changed records CSV and verify Arabic text + UTF-8 BOM
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyBomAndArabicColumnsInCsvFile(
          changedRecordsFileName,
          instance.id,
          arabicColumns,
        );
      },
    );
  });
});
