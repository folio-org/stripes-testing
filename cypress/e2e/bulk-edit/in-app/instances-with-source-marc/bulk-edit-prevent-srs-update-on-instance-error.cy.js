import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';

let user;
const marcInstance = {
  title: `AT_C808444_MarcInstance_${getRandomPostfix()}`,
  instanceId: null,
};
const createMarcFields = (title) => [
  {
    tag: '008',
    content: {
      Type: '\\',
      BLvl: '\\',
      DtSt: '\\',
      Date1: '\\\\\\\\',
      Date2: '\\\\\\\\',
      Ctry: '\\\\\\',
      Lang: 'eng',
      MRec: '\\',
      Srce: '\\',
      Ills: ['\\', '\\', '\\', '\\'],
      Audn: '\\',
      Form: '\\',
      Cont: ['\\', '\\', '\\', '\\'],
      GPub: '\\',
      Conf: '\\',
      Fest: '\\',
      Indx: '\\',
      LitF: '\\',
      Biog: '\\',
    },
  },
  {
    tag: '245',
    content: `$a ${title}`,
    indicators: ['1', '0'],
  },
];
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const newMarcField500 = 'Test note for MARC field 500';
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create MARC instance
        cy.createMarcBibliographicViaAPI(
          QuickMarcEditor.defaultValidLdr,
          createMarcFields(marcInstance.title),
        ).then((instanceId) => {
          marcInstance.instanceId = instanceId;

          FileManager.createFile(
            `cypress/fixtures/${instanceUUIDsFileName}`,
            marcInstance.instanceId,
          );
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    // Trillium
    it.skip(
      'C808444 Verify prevent of updating SRS record if an error occurs during Instance record update (firebird)',
      { tags: [] },
      () => {
        // Step 1: Navigate to Inventory to edit the instance and create version conflict
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.instanceId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.instanceId,
        );

        // Step 2: Navigate to Inventory to edit the instance and create version conflict
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.addAdministrativeNote('Administrative note added in Inventory');
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstancePaneExists();

        // Step 3: Return to Bulk edit and start MARC bulk edit process
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditMarcInstanceForm();

        // Step 4: Change administrative data, marc fields
        BulkEditActions.selectOption('Staff suppress');
        BulkEditSearchPane.verifyInputLabel('Staff suppress');
        BulkEditActions.selectAction('Set true');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('500', '\\', '\\', 'a');
        BulkEditActions.selectActionForMarcInstance('Add');
        BulkEditActions.fillInDataTextAreaForMarcInstance(newMarcField500);

        // Step 5:Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.instanceId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          'true',
        );
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 6: Click "Download preview in MARC format" button
        BulkEditActions.downloadPreviewInMarcFormat();

        // Verify preview MARC contains the new field 500
        const assertionsOnMarcFileContent = [
          {
            uuid: marcInstance.instanceId,
            assertions: [
              (record) => {
                const field500 = record.get('500')[0];

                expect(field500.ind1).to.eq(' ');
                expect(field500.ind2).to.eq(' ');
                expect(field500.subf[0][0]).to.eq('a');
                expect(field500.subf[0][1]).to.eq(newMarcField500);
              },
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 7: Click "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.instanceId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          true,
        );

        // Step 8: Commit changes - this should fail due to optimistic locking
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyNoChangesPreview();
        BulkEditSearchPane.verifyErrorLabel(1);

        const optimisticLockingErrorMessage = ERROR_MESSAGES.OPTIMISTIC_LOCKING;

        BulkEditSearchPane.verifyNonMatchedResults(
          marcInstance.instanceId,
          optimisticLockingErrorMessage,
        );

        // Step 9: Download errors CSV and verify content
        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();

        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `ERROR,${marcInstance.instanceId},The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. /inventory/view/${marcInstance.instanceId}`,
        ]);

        // Step 10: Click on "View latest version" active text
        cy.url().then((bulkEditUrl) => {
          BulkEditSearchPane.clickViewLatestVersionInErrorsAccordionByIdentifier(
            marcInstance.instanceId,
          );
          InventorySearchAndFilter.waitLoading();
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyAdministrativeNote('Administrative note added in Inventory');
          InstanceRecordView.verifyMarkAsStaffSuppressedWarning(false);

          // Step 11: From the tab with "Bulk edit" app:
          // Return to bulk edit page
          cy.visit(bulkEditUrl);
          BulkEditSearchPane.verifyErrorLabel(1);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyMarkAsStaffSuppressedWarning(false);

          // Step 12: View MARC source to confirm field 500 was NOT added
          InstanceRecordView.viewSource();
          InventoryViewSource.waitLoading();
          InventoryViewSource.verifyAbsenceOfValue(newMarcField500);
        });
      },
    );
  });
});
