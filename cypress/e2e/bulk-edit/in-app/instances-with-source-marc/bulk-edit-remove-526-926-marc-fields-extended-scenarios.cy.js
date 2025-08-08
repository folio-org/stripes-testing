/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import DateTools from '../../../../support/utils/dateTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';

let user;
const studyProgramNote1 = 'Happy Valley Reading Club';
const studyProgramNote2 = 'Accelerated Reader AR';
const studyProgramNote2AdditionalX = "This item used for a special parent's viewing";
const studyProgramNote3 = "That's A Fact, Jack!";
const studyProgramNote3AdditionalX = 'Nonpublic note';
const studyProgramNote3AdditionalZ = 'Public note';
const localStudyProgramNote1 = 'Study program name';
const localStudyProgramNote2 = 'Upper Grades';
const localStudyProgramNote2AdditionalX = 'January 1999 selection';
const localStudyProgramNote3 = 'Accelerated Reader/Advantage Learning Systems';
const localStudyProgramNote3AdditionalX = 'Nonpublic note';
const localStudyProgramNote3AdditionalZ = 'Public note';
const marcInstanceWith526And926Fields = {
  title: `AT_C543770_MarcInstanceWithFields_${getRandomPostfix()}`,
};
const marcInstanceWithout526And926Fields = {
  title: `AT_C543770_MarcInstanceWithoutFields_${getRandomPostfix()}`,
};
const marcInstanceWithFieldsData = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstanceWith526And926Fields.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '526',
    content: `$a ${studyProgramNote1}`,
    indicators: ['0', '\\'],
  },
  {
    tag: '526',
    content: `$a ${studyProgramNote2} $x ${studyProgramNote2AdditionalX}`,
    indicators: ['0', '\\'],
  },
  {
    tag: '526',
    content: `$a ${studyProgramNote3} $x ${studyProgramNote3AdditionalX} $z ${studyProgramNote3AdditionalZ}`,
    indicators: ['0', '\\'],
  },
  {
    tag: '926',
    content: `$a ${localStudyProgramNote1}`,
    indicators: ['0', '\\'],
  },
  {
    tag: '926',
    content: `$a ${localStudyProgramNote2} $x ${localStudyProgramNote2AdditionalX}`,
    indicators: ['0', '\\'],
  },
  {
    tag: '926',
    content: `$a ${localStudyProgramNote3} $x ${localStudyProgramNote3AdditionalX} $z ${localStudyProgramNote3AdditionalZ}`,
    indicators: ['0', '\\'],
  },
];
const marcInstanceWithoutFieldsData = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstanceWithout526And926Fields.title}`,
    indicators: ['1', '0'],
  },
];
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const warningMessage = 'No change in MARC fields required';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create MARC instance WITH 526 and 926 fields
        cy.createMarcBibliographicViaAPI(
          QuickMarcEditor.defaultValidLdr,
          marcInstanceWithFieldsData,
        ).then((instanceId) => {
          marcInstanceWith526And926Fields.uuid = instanceId;

          cy.getInstanceById(marcInstanceWith526And926Fields.uuid).then((instanceData) => {
            marcInstanceWith526And926Fields.hrid = instanceData.hrid;
          });
        });

        // Create MARC instance WITHOUT 526 and 926 fields
        cy.createMarcBibliographicViaAPI(
          QuickMarcEditor.defaultValidLdr,
          marcInstanceWithoutFieldsData,
        ).then((instanceId) => {
          marcInstanceWithout526And926Fields.uuid = instanceId;

          cy.getInstanceById(marcInstanceWithout526And926Fields.uuid).then((instanceData) => {
            marcInstanceWithout526And926Fields.hrid = instanceData.hrid;
          });

          // Create CSV file with instance UUIDs
          const instanceUUIDs = [
            marcInstanceWith526And926Fields.uuid,
            marcInstanceWithout526And926Fields.uuid,
          ];
          FileManager.createFile(
            `cypress/fixtures/${instanceUUIDsFileName}`,
            instanceUUIDs.join('\n'),
          );
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstanceWith526And926Fields.uuid);
      InventoryInstance.deleteInstanceViaApi(marcInstanceWithout526And926Fields.uuid);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C543770 Remove MARC field (526, 926) - extended scenarios (MARC) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C543770'] },
      () => {
        // Step 1: Check columns for Source and Study Program Information note
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
        );

        // Verify the instances display proper values
        const expectedNoteWithFields = `${studyProgramNote1} | ${studyProgramNote2} ${studyProgramNote2AdditionalX} | ${studyProgramNote3} ${studyProgramNote3AdditionalX} ${studyProgramNote3AdditionalZ}`;
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
          marcInstanceWith526And926Fields.hrid,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
              value: 'MARC',
            },
            {
              header:
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
              value: expectedNoteWithFields,
            },
          ],
        );
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
          marcInstanceWithout526And926Fields.hrid,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
              value: 'MARC',
            },
            {
              header:
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
              value: '',
            },
          ],
        );

        // Step 2: Open Instances with source MARC bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
        BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
          instanceUUIDsFileName,
          '2 instance',
        );

        // Step 3: Configure first 526 field removal - 526 0\ $x
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('526', '0', '\\', 'x');
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 4: Select "Remove all" action
        BulkEditActions.selectActionForMarcInstance('Remove all');
        BulkEditActions.verifyDataColumnAbsent();
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Add second row for 526 0\ $z
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('526', '0', '\\', 'z', 1);
        BulkEditActions.selectActionForMarcInstance('Remove all', 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Add third row for 926 0\ $x
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('926', '0', '\\', 'x', 2);
        BulkEditActions.selectActionForMarcInstance('Remove all', 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Add fourth row for 926 0\ $z
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('926', '0', '\\', 'z', 3);
        BulkEditActions.selectActionForMarcInstance('Remove all', 3);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 9: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

        // Verify preview shows the expected Study Program Information note column with removed subfields
        const expectedNoteAfterRemoval = studyProgramNote1;

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstanceWith526And926Fields.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
          expectedNoteAfterRemoval,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstanceWithout526And926Fields.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
          '',
        );
        BulkEditActions.verifyAreYouSureForm(2);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();

        // Step 10: Download preview in MARC format
        BulkEditActions.downloadPreviewInMarcFormat();

        // Verify MARC file content for both instances
        const assertionsOnMarcFileContent = [
          {
            uuid: marcInstanceWith526And926Fields.uuid,
            assertions: [
              // Verify that 526 field only contains $a subfield (x and z subfields removed)
              (record) => {
                const fields526 = record.get('526');

                expect(fields526).to.have.length(1);

                const field526 = fields526[0];

                expect(field526.ind1).to.eq('0');
                expect(field526.ind2).to.eq(' ');
                expect(field526.subf).to.have.length(1);
                expect(field526.subf[0][0]).to.eq('a');
                expect(field526.subf[0][1]).to.eq(studyProgramNote1);
              },
              // Verify that 926 field only contains $a subfield (x and z subfields removed)
              (record) => {
                const fields926 = record.get('926');

                expect(fields926).to.have.length(1);

                const field926 = fields926[0];

                expect(field926.ind1).to.eq('0');
                expect(field926.ind2).to.eq(' ');
                expect(field926.subf).to.have.length(1);
                expect(field926.subf[0][0]).to.eq('a');
                expect(field926.subf[0][1]).to.eq(localStudyProgramNote1);
              },
              // Verify 005 field is updated
              (record) => {
                expect(
                  record
                    .get('005')[0]
                    .value.startsWith(DateTools.getCurrentISO8601TimestampUpToMinutesUTC()) ||
                    record
                      .get('005')[0]
                      .value.startsWith(DateTools.getCurrentISO8601TimestampUpToMinutesUTC(1)),
                ).to.be.true;
              },
            ],
          },
          {
            uuid: marcInstanceWithout526And926Fields.uuid,
            assertions: [
              // Verify that 526 fields are empty/not present
              (record) => expect(record.get('526')).to.be.empty,
              // Verify that 926 fields are empty/not present
              (record) => expect(record.get('926')).to.be.empty,
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 2);

        // Step 11: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.previewRecordsCSV, 2);

        // Step 12: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);

        // Verify changes are displayed in the Changed Records accordion
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstanceWith526And926Fields.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
          expectedNoteAfterRemoval,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
        BulkEditSearchPane.verifyErrorLabel(0, 1);

        // Step 13: Check warning message
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
        BulkEditSearchPane.verifyError(
          marcInstanceWithout526And926Fields.uuid,
          warningMessage,
          'Warning',
        );

        // Step 14: Download changed records in MARC format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        const assertionsOnMarcFileContentInChangedRecordsFile = assertionsOnMarcFileContent.slice(
          0,
          1,
        );

        parseMrcFileContentAndVerify(
          fileNames.changedRecordsMarc,
          assertionsOnMarcFileContentInChangedRecordsFile,
          1,
        );

        // Step 15: Download changed records in CSV format
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.changedRecordsCSV, 1);

        // Step 16: Download errors (CSV)
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `WARNING,${marcInstanceWithout526And926Fields.uuid},${warningMessage}`,
        ]);

        // Step 17: Navigate to Inventory and verify changes in instance record
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWith526And926Fields.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Verify Study Program Information note contains only the remaining note
        InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'No',
          'Study Program Information note',
          studyProgramNote1,
        );
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

        // Step 18: View source and verify MARC fields
        InstanceRecordView.viewSource();

        // Verify that only 526 and 926 fields with $a subfields remain
        InventoryViewSource.verifyFieldInMARCBibSource(
          '526',
          `\t526\t0  \t$a ${studyProgramNote1}`,
        );
        InventoryViewSource.verifyFieldInMARCBibSource(
          '926',
          `\t926\t0  \t$a ${localStudyProgramNote1}`,
        );

        // Verify that fields with x and z subfields are no longer present
        InventoryViewSource.notContains(studyProgramNote2AdditionalX);
        InventoryViewSource.notContains(studyProgramNote3AdditionalX);
        InventoryViewSource.notContains(studyProgramNote3AdditionalZ);
        InventoryViewSource.notContains(localStudyProgramNote2AdditionalX);
        InventoryViewSource.notContains(localStudyProgramNote3AdditionalX);
        InventoryViewSource.notContains(localStudyProgramNote3AdditionalZ);

        // Verify 005 field is updated
        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
        InventoryViewSource.close();

        // Step 19: Verify that the instance without 526/926 fields was NOT edited
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWithout526And926Fields.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.viewSource();
        InventoryViewSource.notContains('526\t');
        InventoryViewSource.notContains('926\t');
      },
    );
  });
});
