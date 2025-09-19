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
import SubjectSources from '../../../support/fragments/settings/inventory/instances/subjectSources';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const subjectTableHeadersInFile = 'Subject headings;Subject source;Subject type\n';
const folioInstanceWithoutSubject = {
  title: `AT_C736698_FolioInstance_NoSubject_${getRandomPostfix()}`,
};
const folioInstanceWithSubject = {
  title: `AT_C736698_FolioInstance_WithSubject_${getRandomPostfix()}`,
  subjects: [
    {
      value: 'Computer science',
      sourceId: null,
      typeId: null,
    },
  ],
  subjectTypeName: null,
  subjectSourceName: null,
};
const marcInstanceWithSubject = {
  title: `AT_C736698_MarcInstance_WithSubject_${getRandomPostfix()}`,
  subjects: [
    {
      value: 'Testing 600 subject Testing 600b subject',
      source: 'Library of Congress Subject Headings',
      typeName: 'Personal name',
    },
    {
      value: 'Test 600.2 subject',
      source: 'Source not specified',
      typeName: 'Personal name',
    },
    {
      value: 'Test 610 subject',
      source: 'Medical Subject Headings',
      typeName: 'Corporate name',
    },
    {
      value: 'Test 611 subject',
      source: 'National Agricultural Library subject authority file',
      typeName: 'Meeting name',
    },
    {
      value: 'Test 630 subject',
      source: 'Source not specified',
      typeName: 'Uniform title',
    },
    {
      value: 'Test 647 subject',
      source: 'Canadian Subject Headings',
      typeName: 'Named event',
    },
    {
      value: 'Test 648 subject',
      source: 'Canadian Subject Headings',
      typeName: 'Chronological term',
    },
    {
      value: 'Test 650 subject',
      source: 'Répertoire de vedettes-matière',
      typeName: 'Topical term',
    },
    {
      value: 'Test 651 subject',
      source: "Library of Congress Children's and Young Adults' Subject Headings",
      typeName: 'Geographic name',
    },
    {
      value: 'Test 655 subject',
      source: '-',
      typeName: 'Genre/form',
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
    content: `$a ${marcInstanceWithSubject.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '600',
    content: '$a Testing 600 subject $b Testing 600b subject',
    indicators: ['\\', '0'],
  },
  {
    tag: '600',
    content: `$f ${marcInstanceWithSubject.subjects[1].value}`,
    indicators: ['\\', '4'],
  },
  {
    tag: '610',
    content: `$f ${marcInstanceWithSubject.subjects[2].value}`,
    indicators: ['\\', '2'],
  },
  {
    tag: '611',
    content: `$f ${marcInstanceWithSubject.subjects[3].value}`,
    indicators: ['\\', '3'],
  },
  {
    tag: '630',
    content: `$a ${marcInstanceWithSubject.subjects[4].value}`,
    indicators: ['\\', '4'],
  },
  {
    tag: '647',
    content: `$a ${marcInstanceWithSubject.subjects[5].value}`,
    indicators: ['\\', '5'],
  },
  {
    tag: '648',
    content: `$a ${marcInstanceWithSubject.subjects[6].value}`,
    indicators: ['\\', '5'],
  },
  {
    tag: '650',
    content: `$a ${marcInstanceWithSubject.subjects[7].value}`,
    indicators: ['\\', '6'],
  },
  {
    tag: '651',
    content: `$a ${marcInstanceWithSubject.subjects[8].value}`,
    indicators: ['\\', '1'],
  },
  {
    tag: '655',
    content: `$a ${marcInstanceWithSubject.subjects[9].value}`,
    indicators: ['\\', '7'],
  },
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C736698');

      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.bulkEditLogsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Get instance types once for both FOLIO instances
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          const instanceTypeId = instanceTypeData[0].id;

          // Get subject type ID for FOLIO instance
          cy.getSubjectTypesViaApi({ limit: 1, query: 'source="folio"' }).then((res) => {
            folioInstanceWithSubject.subjects[0].typeId = res[0].id;
            folioInstanceWithSubject.subjectTypeName = res[0].name;

            // Get subject source ID for FOLIO instance
            SubjectSources.getSubjectSourcesViaApi({
              limit: 1,
            }).then((subjectSources) => {
              folioInstanceWithSubject.subjects[0].sourceId = subjectSources[0].id;
              folioInstanceWithSubject.subjectSourceName = subjectSources[0].name;

              // Create FOLIO instance without subject
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstanceWithoutSubject.title,
                },
              }).then((createdInstanceData) => {
                folioInstanceWithoutSubject.instanceId = createdInstanceData.instanceId;

                // Get HRID for instance without subject
                cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                  folioInstanceWithoutSubject.instanceHrid = instance.hrid;
                });
              });

              // Create FOLIO instance with subject
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstanceWithSubject.title,
                  subjects: folioInstanceWithSubject.subjects,
                },
              }).then((createdInstanceData) => {
                folioInstanceWithSubject.instanceId = createdInstanceData.instanceId;

                // Get HRID for instance with subject
                cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                  folioInstanceWithSubject.instanceHrid = instance.hrid;
                });
              });

              // Create MARC instance with multiple subject entries
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields,
              ).then((instanceId) => {
                marcInstanceWithSubject.instanceId = instanceId;

                // Get HRID for MARC instance
                cy.getInstanceById(instanceId).then((instance) => {
                  marcInstanceWithSubject.instanceHrid = instance.hrid;
                });

                // Create CSV file with instance UUIDs
                FileManager.createFile(
                  `cypress/fixtures/${instanceUUIDsFileName}`,
                  `${folioInstanceWithoutSubject.instanceId}\n${folioInstanceWithSubject.instanceId}\n${marcInstanceWithSubject.instanceId}`,
                );
              });
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
        folioInstanceWithoutSubject.instanceId,
        folioInstanceWithSubject.instanceId,
        marcInstanceWithSubject.instanceId,
      ].forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });
    // Trillium
    it.skip(
      'C736698 Verify rendering "Subject" data of Instance record in bulk edit forms and files (firebird)',
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
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );

        // Step 4: Show Subject column
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );

        // Step 5: Verify Subject display in preview table
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          folioInstanceWithoutSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          '',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          folioInstanceWithSubject.instanceHrid,
          folioInstanceWithSubject.subjects[0].value,
          folioInstanceWithSubject.subjectSourceName,
          folioInstanceWithSubject.subjectTypeName,
        );

        marcInstanceWithSubject.subjects.forEach((subject) => {
          BulkEditSearchPane.verifySubjectTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            marcInstanceWithSubject.instanceHrid,
            subject.value,
            subject.source,
            subject.typeName,
          );
        });

        // Step 6: Download matched records and verify CSV content
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        const folioSubjectInFile = `${subjectTableHeadersInFile}${folioInstanceWithSubject.subjects[0].value};${folioInstanceWithSubject.subjectSourceName};${folioInstanceWithSubject.subjectTypeName}`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          folioSubjectInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          '',
        );

        const marcSubjectInFile = `${subjectTableHeadersInFile}${marcInstanceWithSubject.subjects.map((subject) => `${subject.value};${subject.source};${subject.typeName}`).join('|')}`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          marcSubjectInFile,
        );

        // Step 7: Start bulk edit process
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.selectOption('Suppress from discovery');
        BulkEditActions.selectAction('Set true');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();

        // Step 8: Verify Subject in preview of changes
        BulkEditActions.verifyMessageBannerInAreYouSureForm(3);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioInstanceWithoutSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          '',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          folioInstanceWithSubject.instanceHrid,
          folioInstanceWithSubject.subjects[0].value,
          folioInstanceWithSubject.subjectSourceName,
          folioInstanceWithSubject.subjectTypeName,
        );

        marcInstanceWithSubject.subjects.forEach((subject) => {
          BulkEditSearchPane.verifySubjectTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            marcInstanceWithSubject.instanceHrid,
            subject.value,
            subject.source,
            subject.typeName,
          );
        });

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 9: Download preview changes
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          folioSubjectInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          marcSubjectInFile,
        );

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(3);

        // Step 11: Verify Subject in changed records
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioInstanceWithoutSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          '',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          folioInstanceWithSubject.instanceHrid,
          folioInstanceWithSubject.subjects[0].value,
          folioInstanceWithSubject.subjectSourceName,
          folioInstanceWithSubject.subjectTypeName,
        );

        marcInstanceWithSubject.subjects.forEach((subject, index) => {
          BulkEditSearchPane.verifySubjectTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            marcInstanceWithSubject.instanceHrid,
            subject.value,
            subject.source,
            subject.typeName,
            index,
          );
        });

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 12: Download changed records
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          folioSubjectInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          marcSubjectInFile,
        );

        // remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);

        // Steps 13-14: Verify logs and downloadable files
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.verifyLogsRowActionWhenCompleted();

        // Step 15: Click on the "File with the matching records" hyperlink, Check display of "Subject" Instance data
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          folioSubjectInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          marcSubjectInFile,
        );

        // Step 16: Click on the "File with the preview of proposed changes (CSV)" hyperlink, Check display of "Subject" Instance data
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          folioSubjectInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          marcSubjectInFile,
        );

        // Step 17: Click on the "File with updated records (CSV)" hyperlink, Check display of "Subject" Instance data
        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          folioSubjectInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithSubject.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          marcSubjectInFile,
        );
      },
    );
  });
});
