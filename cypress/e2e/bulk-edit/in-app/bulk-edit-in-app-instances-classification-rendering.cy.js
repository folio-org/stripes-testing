import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS, BULK_EDIT_FORMS } from '../../../support/constants';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import ClassificationTypes from '../../../support/fragments/settings/inventory/classification-types/classificationTypes';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const classificationTableHeadersInFile = 'Classification identifier type;Classification\n';
const folioInstanceWithoutClassification = {
  title: `AT_C736695_FolioInstance_NoClassification_${getRandomPostfix()}`,
};
const folioInstanceWithClassification = {
  title: `AT_C736695_FolioInstance_WithClassification_${getRandomPostfix()}`,
  classifications: [
    {
      classificationNumber: '025.04',
      classificationTypeId: null,
    },
  ],
};
const marcInstanceWithClassification = {
  title: `AT_C736695_MarcInstance_WithClassification_${getRandomPostfix()}`,
  classifications: [
    {
      classificationNumber: 'JK609 .M2',
      classificationTypeName: 'LC',
    },
    {
      classificationNumber: 'WW 166 M43k 1973',
      classificationTypeName: 'NLM',
    },
    {
      classificationNumber: '971.1/.2',
      classificationTypeName: 'UDC',
    },
    {
      classificationNumber: '975.5425200222',
      classificationTypeName: 'Dewey',
    },
    {
      classificationNumber: 'ITC 1.12:TA-503 (A)-18 AND 332-279',
      classificationTypeName: 'GDC',
    },
    {
      classificationNumber: 'Local classification',
      classificationTypeName: 'LC',
    },
  ],
};
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstanceWithClassification.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '050',
    content: '$a JK609 $b .M2',
    indicators: ['0', '0'],
  },
  {
    tag: '060',
    content: '$a WW 166 $b M43k 1973',
    indicators: ['1', '0'],
  },
  {
    tag: '080',
    content: `$a ${marcInstanceWithClassification.classifications[2].classificationNumber}`,
    indicators: ['\\', '\\'],
  },
  {
    tag: '082',
    content: '$a 975.5/4252/00222 $2 22',
    indicators: ['0', '0'],
  },
  {
    tag: '086',
    content: `$a ${marcInstanceWithClassification.classifications[4].classificationNumber}`,
    indicators: ['0', '\\'],
  },
  {
    tag: '090',
    content: `$a ${marcInstanceWithClassification.classifications[5].classificationNumber}`,
    indicators: ['\\', '\\'],
  },
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C736695');

      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.bulkEditLogsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Get classification types for FOLIO instance
        ClassificationTypes.getClassificationTypesViaApi({
          limit: 100,
          query: 'name=="Dewey"',
        }).then(({ classificationTypes }) => {
          const deweyType = classificationTypes[0];
          folioInstanceWithClassification.classifications[0].classificationTypeId = deweyType.id;

          // Get instance types once for both FOLIO instances
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            const instanceTypeId = instanceTypeData[0].id;

            // Create FOLIO instance without classification
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstanceWithoutClassification.title,
              },
            }).then((createdInstanceData) => {
              folioInstanceWithoutClassification.instanceId = createdInstanceData.instanceId;

              // Get HRID for instance without classification
              cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                folioInstanceWithoutClassification.instanceHrid = instance.hrid;
              });
            });

            // Create FOLIO instance with classification
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstanceWithClassification.title,
                classifications: folioInstanceWithClassification.classifications,
              },
            }).then((createdInstanceData) => {
              folioInstanceWithClassification.instanceId = createdInstanceData.instanceId;

              // Get HRID for instance with classification
              cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                folioInstanceWithClassification.instanceHrid = instance.hrid;
              });
            });

            // Create MARC instance with multiple classification entries
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstanceFields,
            ).then((instanceId) => {
              marcInstanceWithClassification.instanceId = instanceId;

              // Get HRID for MARC instance
              cy.getInstanceById(instanceId).then((instance) => {
                marcInstanceWithClassification.instanceHrid = instance.hrid;
              });

              // Create CSV file with instance UUIDs
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${folioInstanceWithoutClassification.instanceId}\n${folioInstanceWithClassification.instanceId}\n${marcInstanceWithClassification.instanceId}`,
              );
            });
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
      Users.deleteViaApi(user.userId);

      [
        folioInstanceWithoutClassification.instanceId,
        folioInstanceWithClassification.instanceId,
        marcInstanceWithClassification.instanceId,
      ].forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    // Trillium
    it.skip(
      'C736695 Verify rendering "Classification" data of Instance record in bulk edit forms and files (firebird)',
      { tags: [] },
      () => {
        // Step 1: Select record type and identifier
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

        // Step 2: Upload CSV file
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check upload result
        BulkEditSearchPane.verifyPaneRecordsCount('3 instance');
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          false,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
        );

        // Step 4: Show Classification column
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
        );

        // Step 5: Verify Classification display in preview table
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          folioInstanceWithoutClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          '',
        );
        BulkEditSearchPane.verifyClassificationTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          folioInstanceWithClassification.instanceHrid,
          'Dewey',
          folioInstanceWithClassification.classifications[0].classificationNumber,
        );
        marcInstanceWithClassification.classifications.forEach((classification) => {
          BulkEditSearchPane.verifyClassificationTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            marcInstanceWithClassification.instanceHrid,
            classification.classificationTypeName,
            classification.classificationNumber,
          );
        });

        // Step 6: Download matched records and verify CSV content
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        const folioClassificationInFile = `${classificationTableHeadersInFile}Dewey;${folioInstanceWithClassification.classifications[0].classificationNumber}`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          folioClassificationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          '',
        );

        const marcClassificationInFile = `${classificationTableHeadersInFile}${marcInstanceWithClassification.classifications.map((classification) => `${classification.classificationTypeName};${classification.classificationNumber}`).join('|')}`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          marcClassificationInFile,
        );

        // Step 7: Start bulk edit process
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.selectOption('Suppress from discovery');
        BulkEditActions.selectAction('Set true');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();

        // Step 8: Verify Classification in preview of changes
        BulkEditActions.verifyMessageBannerInAreYouSureForm(3);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioInstanceWithoutClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          '',
        );
        BulkEditSearchPane.verifyClassificationTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          folioInstanceWithClassification.instanceHrid,
          'Dewey',
          folioInstanceWithClassification.classifications[0].classificationNumber,
        );
        marcInstanceWithClassification.classifications.forEach((classification) => {
          BulkEditSearchPane.verifyClassificationTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            marcInstanceWithClassification.instanceHrid,
            classification.classificationTypeName,
            classification.classificationNumber,
          );
        });

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 9: Download preview changes
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          folioClassificationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          marcClassificationInFile,
        );

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(3);

        // Step 11: Verify Classification in changed records
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioInstanceWithoutClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          '',
        );
        BulkEditSearchPane.verifyClassificationTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          folioInstanceWithClassification.instanceHrid,
          'Dewey',
          folioInstanceWithClassification.classifications[0].classificationNumber,
        );

        marcInstanceWithClassification.classifications.forEach((classification, index) => {
          BulkEditSearchPane.verifyClassificationTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            marcInstanceWithClassification.instanceHrid,
            classification.classificationTypeName,
            classification.classificationNumber,
            index,
          );
        });

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 12: Download changed records
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          folioClassificationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          marcClassificationInFile,
        );

        // remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);

        // Steps 13-14: Verify logs and downloadable files
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.verifyLogsRowActionWhenCompleted();

        // Step 15: Click on the "File with the matching records" hyperlink, Check display of "Classification" Instance data
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          folioClassificationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          marcClassificationInFile,
        );

        // Step 16: Click on the "File with the preview of proposed changes (CSV)" hyperlink, Check display of "Classification" Instance data
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          folioClassificationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          marcClassificationInFile,
        );

        // Step 17: Click on the "File with updated records (CSV)" hyperlink, Check display of "Classification" Instance data
        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          folioClassificationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithClassification.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          marcClassificationInFile,
        );
      },
    );
  });
});
