import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_FORMS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
let createdAuthorityID610;
let createdAuthorityID240;
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const marcInstance = {
  title: `AT_C663262_MarcInstance_${getRandomPostfix()}`,
};
const authorityHeadingToLink610Field = 'AT_C663262_Radio "Vaticana".';
const authorityHeadingToLink240Field = 'AT_C663262_Variations,';
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '240',
    content: `$a ${authorityHeadingToLink240Field} $m piano, violin, cello, $n op. 44, $r E♭ major`,
    indicators: ['1', '0'],
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '610',
    content: `$a ${authorityHeadingToLink610Field} $b Hrvatski program $v Congresses $u test`,
    indicators: ['2', '0'],
  },
];
const marcAuthFiles = [
  {
    marc: 'marcAuthFileC663262_1.mrc',
    fileName: `testMarcAuthC663262File_610.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    fieldTag: '610',
  },
  {
    marc: 'marcAuthFileC663262_2.mrc',
    fileName: `testMarcAuthC663262File_240.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    fieldTag: '240',
  },
];
const subjectTableHeadersInFile = 'Subject headings;Subject source;Subject type\n';

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C663262');

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            marcInstance.id = instanceId;

            cy.getInstanceById(marcInstance.id).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;
            });

            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, marcInstance.id);

            marcAuthFiles.forEach((authFile) => {
              DataImport.uploadFileViaApi(
                authFile.marc,
                authFile.fileName,
                authFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  if (authFile.fieldTag === '610') {
                    createdAuthorityID610 = record.authority.id;
                  } else if (authFile.fieldTag === '240') {
                    createdAuthorityID240 = record.authority.id;
                  }
                });
              });
            });

            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });

            // Navigate to instance and link authority fields via UI
            InventoryInstances.searchByTitle(marcInstance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            // Link field 240 to authority
            InventoryInstance.verifyAndClickLinkIcon('240');
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults('AT_C663262_Beethoven, Ludwig van');
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority('240');

            // Link field 610 to authority
            InventoryInstance.verifyAndClickLinkIcon('610');
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults('AT_C663262_Radio "Vaticana".');
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority('610');
            QuickMarcEditor.updateLDR06And07Positions();

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
              'Instances',
              'Instance UUIDs',
            );
            BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
            BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
            BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
            BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
          },
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.id);

      [createdAuthorityID610, createdAuthorityID240].forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C663262 Bulk edit read-only subfields (a, 9) of marc fields (610, 240) linked to authority record (firebird)',
      { tags: ['criticalPath', 'firebird', 'C663262'] },
      () => {
        // Step 1: Check "Subject" checkbox to show column
        BulkEditActions.openActions();
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
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          marcInstance.hrid,
          `${authorityHeadingToLink610Field} Hrvatski program test--Congresses`,
          'Library of Congress Subject Headings',
          'Corporate name',
        );

        // Step 2: Uncheck "Subject" checkbox to hide column
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          false,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );

        // Step 3: Open MARC bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 4: Configure 610 field subfield a - Find and Replace (read-only subfield)
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('610', '2', '0', 'a');
        BulkEditActions.findAndReplaceWithActionForMarc(
          authorityHeadingToLink610Field,
          'Edited subfield a.',
        );
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Add new row for 240 field subfield 9 - Find and Remove (read-only subfield)
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('240', '1', '0', '9', 1);
        BulkEditActions.findAndRemoveSubfieldActionForMarc(createdAuthorityID240, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Confirm changes and verify "Are you sure?" form
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          marcInstance.hrid,
          'Edited subfield a. Hrvatski program Congresses test',
          'Library of Congress Subject Headings',
          'Corporate name',
        );

        // Step 7: Download preview in MARC format
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
        BulkEditActions.downloadPreviewInMarcFormat();

        const assertionsOnPreviewMarcFileContent = [
          {
            uuid: marcInstance.id,
            assertions: [
              // Field 610 - Subject corporate name with authority linking (preview shows changes)
              (record) => {
                const field610 = record.get('610')[0];
                expect(field610.ind1).to.eq('2');
                expect(field610.ind2).to.eq('0');

                // Verify subfield $a (corporate name) - changed in preview
                const subfieldA = field610.subf.find((s) => s[0] === 'a');
                expect(subfieldA[1]).to.eq('Edited subfield a.');

                // Verify subfield $b (subordinate unit) - preserved
                const subfieldB = field610.subf.find((s) => s[0] === 'b');
                expect(subfieldB[1]).to.eq('Hrvatski program');

                // Verify subfield $u (affiliation) - preserved
                const subfieldU = field610.subf.find((s) => s[0] === 'u');
                expect(subfieldU[1]).to.eq('test');

                // Verify subfield $0 (authority record control number) - preserved
                const subfield0 = field610.subf.find((s) => s[0] === '0');
                expect(subfield0[1]).to.eq('http://id.loc.gov/authorities/names/n93094742');

                // Verify subfield $9 (UUID of linked authority record) - preserved in preview
                const subfield9 = field610.subf.find((s) => s[0] === '9');
                expect(subfield9[1]).to.eq(createdAuthorityID610);
              },

              // Field 240 - Uniform title with authority linking (preview shows changes)
              (record) => {
                const field240 = record.get('240')[0];
                expect(field240.ind1).to.eq('1');
                expect(field240.ind2).to.eq('0');

                // Verify subfield $a (uniform title) - preserved
                const subfieldA = field240.subf.find((s) => s[0] === 'a');
                expect(subfieldA[1]).to.eq(authorityHeadingToLink240Field);

                // Verify subfield $m (medium of performance) - preserved
                const subfieldM = field240.subf.find((s) => s[0] === 'm');
                expect(subfieldM[1]).to.eq('piano, violin, cello,');

                // Verify subfield $n (number of part/section) - preserved
                const subfieldN = field240.subf.find((s) => s[0] === 'n');
                expect(subfieldN[1]).to.eq('op. 44,');

                // Verify subfield $r (key for music) - preserved
                const subfieldR = field240.subf.find((s) => s[0] === 'r');
                expect(subfieldR[1]).to.eq('E♭ major');

                // Verify subfield $0 (authority record control number) - preserved
                const subfield0 = field240.subf.find((s) => s[0] === '0');
                expect(subfield0[1]).to.eq('http://id.loc.gov/authorities/names/n83130832');

                // Verify subfield $9 (UUID of linked authority record) - should be removed in preview
                const subfield9 = field240.subf.find((s) => s[0] === '9');
                if (subfield9) {
                  expect.fail('Subfield $9 should not exist in field 240 preview');
                }
              },

              // Field 999 - System control field
              (record) => {
                const field999 = record.get('999')[0];
                expect(field999.subf[0][0]).to.eq('i');
                expect(field999.subf[0][1]).to.eq(marcInstance.id);
              },
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          fileNames.previewRecordsMarc,
          assertionsOnPreviewMarcFileContent,
          1,
        );

        // Step 8: Download preview in CSV format
        BulkEditActions.downloadPreview();

        const editedSubjectInFile = `${subjectTableHeadersInFile}Edited subfield a. Hrvatski program Congresses test;Library of Congress Subject Headings;Corporate name`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          editedSubjectInFile,
        );

        // Step 9: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          marcInstance.hrid,
          `${authorityHeadingToLink610Field} Hrvatski program test Congresses`,
          'Library of Congress Subject Headings',
          'Corporate name',
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 10: Download changed records in MARC format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        const assertionsOnChangedMarcFileContent = [
          {
            uuid: marcInstance.id,
            assertions: [
              // Field 610 - Subject corporate name STILL linked to authority (changes NOT applied)
              (record) => {
                const field610 = record.get('610')[0];
                expect(field610.ind1).to.eq('2');
                expect(field610.ind2).to.eq('0');

                // Verify subfield $a (corporate name) - NOT changed (read-only subfield protected)
                const subfieldA = field610.subf.find((s) => s[0] === 'a');
                expect(subfieldA[1]).to.eq(authorityHeadingToLink610Field);

                // Verify subfield $b (subordinate unit) - preserved
                const subfieldB = field610.subf.find((s) => s[0] === 'b');
                expect(subfieldB[1]).to.eq('Hrvatski program');

                // Verify subfield $u (affiliation) - preserved
                const subfieldU = field610.subf.find((s) => s[0] === 'u');
                expect(subfieldU[1]).to.eq('test');

                // Verify subfield $0 (authority record control number) - preserved
                const subfield0 = field610.subf.find((s) => s[0] === '0');
                expect(subfield0[1]).to.eq('http://id.loc.gov/authorities/names/n93094742');

                // Verify subfield $9 (UUID of linked authority record) - preserved (still linked)
                const subfield9 = field610.subf.find((s) => s[0] === '9');
                expect(subfield9[1]).to.eq(createdAuthorityID610);
              },

              // Field 240 - Uniform title STILL linked to authority (changes NOT applied)
              (record) => {
                const field240 = record.get('240')[0];
                expect(field240.ind1).to.eq('1');
                expect(field240.ind2).to.eq('0');

                // Verify subfield $a (uniform title) - preserved
                const subfieldA = field240.subf.find((s) => s[0] === 'a');
                expect(subfieldA[1]).to.eq(authorityHeadingToLink240Field);

                // Verify subfield $m (medium of performance) - preserved
                const subfieldM = field240.subf.find((s) => s[0] === 'm');
                expect(subfieldM[1]).to.eq('piano, violin, cello,');

                // Verify subfield $n (number of part/section) - preserved
                const subfieldN = field240.subf.find((s) => s[0] === 'n');
                expect(subfieldN[1]).to.eq('op. 44,');

                // Verify subfield $r (key for music) - preserved
                const subfieldR = field240.subf.find((s) => s[0] === 'r');
                expect(subfieldR[1]).to.eq('E♭ major');

                // Verify subfield $0 (authority record control number) - preserved
                const subfield0 = field240.subf.find((s) => s[0] === '0');
                expect(subfield0[1]).to.eq('http://id.loc.gov/authorities/names/n83130832');

                // Verify subfield $9 (UUID of linked authority record) - NOT removed (still linked)
                const subfield9 = field240.subf.find((s) => s[0] === '9');
                expect(subfield9[1]).to.eq(createdAuthorityID240);
              },

              // Field 999 - System control field
              (record) => {
                const field999 = record.get('999')[0];
                expect(field999.subf[0][0]).to.eq('i');
                expect(field999.subf[0][1]).to.eq(marcInstance.id);
              },
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          fileNames.changedRecordsMarc,
          assertionsOnChangedMarcFileContent,
          1,
        );

        // Step 11: Download changed records in CSV format
        BulkEditActions.downloadChangedCSV();

        const notEditedSubjectInFile = `${subjectTableHeadersInFile}${authorityHeadingToLink610Field} Hrvatski program test Congresses;Library of Congress Subject Headings;Corporate name`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          notEditedSubjectInFile,
        );

        // remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);

        // Step 12: Navigate to Logs tab and verify bulk edit job
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkInstancesCheckbox();

        // Step 13: Download preview file from Logs
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.downloadFileWithProposedChanges();

        // Issue MODBULKOPS-504
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          editedSubjectInFile,
        );

        // Step 14: Verify changes in Inventory app - fields remain linked
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.verifyInstanceRecordViewOpened();

        // Verify Uniform title is still linked to MARC Authority
        InstanceRecordView.verifyAlternativeTitle(
          0,
          `${authorityHeadingToLink240Field} piano, violin, cello, op. 44, E♭ major`,
          true,
        );

        // Verify Subject is still linked to MARC Authority
        InstanceRecordView.verifyInstanceSubject(
          {
            indexRow: 0,
            subjectHeadings: `${authorityHeadingToLink610Field} Hrvatski program test--Congresses`,
            subjectSource: 'Library of Congress Subject Headings',
            subjectType: 'Corporate name',
          },
          true,
        );

        // Step 15: View source and verify MARC changes - fields are STILL linked
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '240',
          `$a ${authorityHeadingToLink240Field} $m piano, violin, cello, $n op. 44, $r E♭ major $0 http://id.loc.gov/authorities/names/n83130832 $9 ${createdAuthorityID240}`,
        );
        InventoryViewSource.verifyFieldInMARCBibSource(
          '610',
          `$a ${authorityHeadingToLink610Field} $b Hrvatski program $u test $v Congresses $0 http://id.loc.gov/authorities/names/n93094742 $9 ${createdAuthorityID610}`,
        );

        // Verify fields are STILL linked to authority (linking icons present)
        InventoryViewSource.verifyLinkedToAuthorityIcon(4, true);
        InventoryViewSource.verifyLinkedToAuthorityIcon(6, true);
        InventoryViewSource.close();

        // Step 16: Edit MARC bibliographic record and verify fields are STILL linked
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterLinking(
          4,
          '240',
          '1',
          '0',
          `$a ${authorityHeadingToLink240Field} $m piano, violin, cello, $n op. 44, $r E♭ major`,
          '',
          '$0 http://id.loc.gov/authorities/names/n83130832',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          6,
          '610',
          '2',
          '0',
          `$a ${authorityHeadingToLink610Field} $b Hrvatski program`,
          '$u test $v Congresses',
          '$0 http://id.loc.gov/authorities/names/n93094742',
          '',
        );
      },
    );
  });
});
