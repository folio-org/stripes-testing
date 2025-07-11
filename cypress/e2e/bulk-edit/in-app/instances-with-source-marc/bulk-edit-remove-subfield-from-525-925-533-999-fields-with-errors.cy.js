/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const field525a = 'Supplements accompany some issues.';
const field925a = 'Has numerous supplements.';
const field933a = 'Photocopy.';
const marcInstanceWith525Field = {
  fields: [
    {
      tag: '008',
      content: QuickMarcEditor.defaultValid008Values,
    },
    {
      tag: '245',
      content: `$a AT_C543809_MarcInstance525_${getRandomPostfix()}`,
      indicators: ['1', '0'],
    },
    { tag: '525', content: `$a ${field525a}`, indicators: ['\\', '\\'] },
  ],
};
const marcInstanceWith925Field = {
  fields: [
    {
      tag: '008',
      content: QuickMarcEditor.defaultValid008Values,
    },
    {
      tag: '245',
      content: `$a AT_C543809_MarcInstance925_${getRandomPostfix()}`,
      indicators: ['1', '0'],
    },
    { tag: '925', content: `$a ${field925a}`, indicators: ['\\', '\\'] },
  ],
};
const marcInstanceWith933Field = {
  fields: [
    {
      tag: '008',
      content: QuickMarcEditor.defaultValid008Values,
    },
    {
      tag: '245',
      content: `$a AT_C543809_MarcInstance933_${getRandomPostfix()}`,
      indicators: ['1', '0'],
    },
    { tag: '933', content: `$a ${field933a}`, indicators: ['\\', '\\'] },
  ],
};
const marcInstances = [
  marcInstanceWith525Field,
  marcInstanceWith925Field,
  marcInstanceWith933Field,
];
const folioInstance = {
  title: `AT_C543809_FolioInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const errorMessage =
  'Instance with source FOLIO is not supported by MARC records bulk edit and cannot be updated.';
const warningMessage = 'No change in MARC fields required';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          marcInstances.forEach((marcInstance) => {
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstance.fields,
            ).then((uuid) => {
              marcInstance.uuid = uuid;

              cy.getInstanceById(uuid).then((instanceData) => {
                marcInstance.hrid = instanceData.hrid;
              });
            });
          });
        })
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            folioInstance.instanceTypeId = instanceTypes[0].id;

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: folioInstance.instanceTypeId,
                title: folioInstance.title,
              },
            }).then((instance) => {
              folioInstance.uuid = instance.instanceId;

              cy.getInstanceById(instance.instanceId).then((folioInstanceData) => {
                folioInstance.hrid = folioInstanceData.hrid;

                FileManager.createFile(
                  `cypress/fixtures/${instanceUUIDsFileName}`,
                  marcInstances
                    .map((i) => i.uuid)
                    .concat(folioInstance.uuid)
                    .join('\n'),
                );
              });
            });
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
          BulkEditSearchPane.verifyPaneRecordsCount('4 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      [
        marcInstanceWith525Field.uuid,
        marcInstanceWith925Field.uuid,
        marcInstanceWith933Field.uuid,
        folioInstance.uuid,
      ].forEach((uuid) => {
        InventoryInstance.deleteInstanceViaApi(uuid);
      });

      FileManager.deleteFileFromDownloadsByMask(instanceUUIDsFileName);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C543809 Find and remove subfield from MARC field (525, 925, 533, 999) with errors (MARC & FOLIO, Logs) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C543809'] },
      () => {
        // Step 1: Show Source column
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );

        marcInstances.forEach((marcInstance) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            'MARC',
          );
        });

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          folioInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          'FOLIO',
        );

        // Step 2: Open combined bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 3: 525 $a Find, Remove subfield
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('525', '\\', '\\', 'a');
        BulkEditActions.findAndRemoveSubfieldActionForMarc(field525a);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 4: Add new row for 925 $a Find, Remove subfield
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('925', '\\', '\\', 'a', 1);
        BulkEditActions.findAndRemoveSubfieldActionForMarc('Has supplements', 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Add new row for 533 $a Find, Remove subfield
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('533', '\\', '\\', 'a', 2);
        BulkEditActions.findAndRemoveSubfieldActionForMarc(field525a, 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Add new row for 999 $f $f $b Find, Remove subfield
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('999', 'f', 'f', 'b', 3);
        BulkEditActions.findAndRemoveSubfieldActionForMarc(field525a, 3);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 7: Click info icon
        BulkEditActions.clickInfoIconNextToSubfieldAndVerifyText(3);

        // Step 8: Replace 999 with 933 and indicators with \
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('933', '\\', '\\', 'b', 3);
        BulkEditActions.verifyThereIsNoInfoIconNextToSubfield(3);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 9: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(3, 1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(3);
        BulkEditActions.verifyAreYouSureForm(3);
        BulkEditSearchPane.verifyCellWithContentAbsentsInAreYouSureForm(field525a);

        marcInstances.forEach((marcInstance) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            'MARC',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPLEMENT_NOTE,
            '',
          );
        });

        // Step 10: Download preview in MARC format
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
        BulkEditActions.downloadPreviewInMarcFormat();

        const assertionsOnMarcFileContentInPreviewFile = [
          {
            uuid: marcInstanceWith525Field.uuid,
            assertions: [
              (record) => {
                marcInstanceWith525Field.field005Value = record.get('005')[0].value;
              },
              (record) => expect(record.get('525')[0].subf).to.be.undefined,
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => {
                expect(record.get('999')[0].subf[0][1]).to.eq(marcInstanceWith525Field.uuid);
              },
            ],
          },
          {
            uuid: marcInstanceWith925Field.uuid,
            assertions: [
              (record) => {
                marcInstanceWith925Field.field005Value = record.get('005')[0].value;
              },
              (record) => expect(record.get('925')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('925')[0].subf[0][1]).to.eq(field925a),
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => {
                expect(record.get('999')[0].subf[0][1]).to.eq(marcInstanceWith925Field.uuid);
              },
            ],
          },
          {
            uuid: marcInstanceWith933Field.uuid,
            assertions: [
              (record) => {
                marcInstanceWith933Field.field005Value = record.get('005')[0].value;
              },
              (record) => expect(record.get('933')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('933')[0].subf[0][1]).to.eq(field933a),
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => {
                expect(record.get('999')[0].subf[0][1]).to.eq(marcInstanceWith933Field.uuid);
              },
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          fileNames.previewRecordsMarc,
          assertionsOnMarcFileContentInPreviewFile,
          3,
        );

        cy.then(() => {
          expect(marcInstanceWith525Field.field005Value).to.not.equal(
            marcInstanceWith925Field.field005Value,
          );
          expect(marcInstanceWith525Field.field005Value).to.not.equal(
            marcInstanceWith933Field.field005Value,
          );
        });

        // Step 11: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWith525Field.hrid,
          'Notes',
          'Supplement note;;false',
        );
        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.previewRecordsCSV, 3);

        // Step 12: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstanceWith525Field.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPLEMENT_NOTE,
          '',
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
        BulkEditSearchPane.verifyErrorLabel(1, 2);
        BulkEditSearchPane.verifyShowWarningsCheckbox(false, false);
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

        // Step 13: Verify errors in the Errors accordion
        BulkEditSearchPane.verifyError(folioInstance.uuid, errorMessage);

        // Step 14: Verify warnings in the Errors accordion
        BulkEditSearchPane.clickShowWarningsCheckbox();
        BulkEditSearchPane.verifyError(folioInstance.uuid, errorMessage);
        BulkEditSearchPane.verifyError(marcInstanceWith925Field.uuid, warningMessage, 'Warning');
        BulkEditSearchPane.verifyError(marcInstanceWith933Field.uuid, warningMessage, 'Warning');
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(3);

        // Step 15: Download changed records (MARC)
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        const assertionsOnMarcFileContentInChangedFile = [
          {
            uuid: marcInstanceWith525Field.uuid,
            assertions: [
              (record) => expect(record.get('525')[0].subf).to.be.undefined,

              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => {
                expect(record.get('999')[0].subf[0][1]).to.eq(marcInstanceWith525Field.uuid);
              },
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          fileNames.changedRecordsMarc,
          assertionsOnMarcFileContentInChangedFile,
          1,
        );

        // Step 16: Download changed records (CSV)
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWith525Field.hrid,
          'Notes',
          'Supplement note;;false',
        );

        // Step 17: Download errors (CSV)
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `ERROR,${folioInstance.uuid},${errorMessage}`,
          `WARNING,${marcInstanceWith925Field.uuid},${warningMessage}`,
          `WARNING,${marcInstanceWith933Field.uuid},${warningMessage}`,
        ]);

        // remove earlier downloaded files
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);

        // Step 18-20: Navigate to "Logs" tab of Bulk edit
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.verifyLogStatus(user.username, 'Inventory - instances (MARC)');
        BulkEditLogs.verifyLogStatus(user.username, 'In app');
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.verifyLogsRowActionWhenCompleted(true);

        // Step 21: Download and verify file that was used to trigger the bulk edit
        BulkEditLogs.downloadFileUsedToTrigger();
        BulkEditFiles.verifyCSVFileRows(instanceUUIDsFileName, [
          marcInstanceWith525Field.uuid,
          marcInstanceWith925Field.uuid,
          marcInstanceWith933Field.uuid,
          folioInstance.uuid,
        ]);
        BulkEditFiles.verifyCSVFileRecordsNumber(instanceUUIDsFileName, 4);

        // Step 22: Download and verify file with the matching records
        BulkEditLogs.downloadFileWithMatchingRecords();

        // Step 23: Download and verify file with the preview of proposed changes (MARC)
        BulkEditLogs.downloadFileWithProposedChangesMarc();

        parseMrcFileContentAndVerify(
          fileNames.previewRecordsMarc,
          assertionsOnMarcFileContentInPreviewFile,
          3,
        );

        // Step 24: Download and verify file with the preview of proposed changes (CSV)
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWith525Field.hrid,
          'Notes',
          'Supplement note;;false',
        );
        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.previewRecordsCSV, 3);

        // Step 25: Download and verify file with updated records (MARC)
        BulkEditLogs.downloadFileWithUpdatedRecordsMarc();

        parseMrcFileContentAndVerify(
          fileNames.changedRecordsMarc,
          assertionsOnMarcFileContentInChangedFile,
          1,
        );

        // Step 26: Download and verify file with updated records (CSV)
        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWith525Field.hrid,
          'Notes',
          'Supplement note;;false',
        );

        // Step 27: Download and verify file with errors encountered when committing the changes
        BulkEditLogs.downloadFileWithCommitErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `ERROR,${folioInstance.uuid},${errorMessage}`,
          `WARNING,${marcInstanceWith925Field.uuid},${warningMessage}`,
          `WARNING,${marcInstanceWith933Field.uuid},${warningMessage}`,
        ]);

        // Step 28-29: Inventory app - verify changes
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWith525Field.uuid);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion('Supplement note');
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('525', '\t525\t   \t');
        InventoryViewSource.close();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWith925Field.uuid);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('925', `\t925\t   \t$a ${field925a}`);
        InventoryViewSource.close();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWith933Field.uuid);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('933', `\t933\t   \t$a ${field933a}`);
      },
    );
  });
});
