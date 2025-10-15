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
import MarcFieldProtection from '../../../../support/fragments/settings/dataImport/marcFieldProtection';

let user;
let createdAuthorityID100;
let createdAuthorityID700;
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const marcInstance = {
  title: `AT_C663255_MarcInstance_${getRandomPostfix()}`,
};
const authorityHeadingToLink100Field = 'AT_C663255 Coates, Ta-Nehisi';
const authorityHeadingToLink700Field = 'AT_C663255_Sabino, Joe';
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '100',
    content: `$a ${authorityHeadingToLink100Field} $e author.`,
    indicators: ['1', '\\'],
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '700',
    content: '$e letterer.$j not important value $2 tes34',
    indicators: ['1', '\\'],
  },
];
const marcAuthFiles = [
  {
    marc: 'marcAuthFileC663255_2.mrc',
    fileName: `testMarcAuthC663255File_100.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    fieldTag: '100',
  },
  {
    marc: 'marcAuthFileC663255_1.mrc',
    fileName: `testMarcAuthC663255File_700.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    fieldTag: '700',
  },
];

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

        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C663255');
        MarcFieldProtection.deleteProtectedFieldsViaApi(['100', '700']);

        // Create MARC bibliographic record with specified fields
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            marcInstance.id = instanceId;

            cy.getInstanceById(marcInstance.id).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;
            });

            // Create CSV file with instance UUID
            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, marcInstance.id);

            // Upload authority files using forEach loop
            marcAuthFiles.forEach((authFile) => {
              DataImport.uploadFileViaApi(
                authFile.marc,
                authFile.fileName,
                authFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  if (authFile.fieldTag === '100') {
                    createdAuthorityID100 = record.authority.id;
                  } else if (authFile.fieldTag === '700') {
                    createdAuthorityID700 = record.authority.id;
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

            // Link field 100 to authority
            InventoryInstance.verifyAndClickLinkIcon('100');
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(authorityHeadingToLink100Field);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority('100');

            // Link field 700 to authority
            InventoryInstance.verifyAndClickLinkIcon('700');
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(authorityHeadingToLink700Field);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority('700');
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

      [createdAuthorityID100, createdAuthorityID700].forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C663255 Bulk edit editable subfields (e, 2, 4) of marc fields (100, 700) linked to authority record (firebird)',
      { tags: ['criticalPath', 'firebird', 'C663255'] },
      () => {
        // Step 1: Check "Contributors" checkbox to show column
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          `${authorityHeadingToLink100Field}; ${authorityHeadingToLink700Field}`,
        );

        // Step 2: Uncheck "Contributors" checkbox to hide column
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          false,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );

        // Step 3: Open MARC bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 4: Configure 100 field subfield e - Find and Replace
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('100', '1', '\\', 'e');
        BulkEditActions.findAndReplaceWithActionForMarc('author', 'interviewer');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Add new row for 100 field subfield a - Find and Append
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('100', '1', '\\', 'a', 1);
        BulkEditActions.findAndAppendActionForMarc('Coates, Ta-Nehisi', '4', 'org', 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Add new row for 700 field subfield 2 - Find and Replace
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('700', '1', '\\', '2', 2);
        BulkEditActions.findAndReplaceWithActionForMarc('tes34', 'Source of heading or term', 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Confirm changes and verify "Are you sure?" form
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          `${authorityHeadingToLink100Field}; ${authorityHeadingToLink700Field}`,
        );

        // Step 8: Download preview in MARC format
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
        BulkEditActions.downloadPreviewInMarcFormat();

        const assertionsOnMarcFileContent = [
          {
            uuid: marcInstance.id,
            assertions: [
              // Field 100 - Main entry with authority linking
              (record) => {
                const field100 = record.get('100')[0];
                expect(field100.ind1).to.eq('1');
                expect(field100.ind2).to.eq(' ');

                // Verify subfield $a (name)
                const subfieldA = field100.subf.find((s) => s[0] === 'a');
                expect(subfieldA[1]).to.eq(authorityHeadingToLink100Field);

                // Verify subfield $e (relator term) - changed by bulk edit
                const subfieldE = field100.subf.find((s) => s[0] === 'e');
                expect(subfieldE[1]).to.eq('interviewer.');

                // Verify subfield $4 (relator code) - added by bulk edit
                const subfield4 = field100.subf.find((s) => s[0] === '4');
                expect(subfield4[1]).to.eq('org');

                // Verify subfield $0 (authority record control number) - preserved
                const subfield0 = field100.subf.find((s) => s[0] === '0');
                expect(subfield0[1]).to.equal(
                  'http://id.loc.gov/authorities/names/n2008001084C663255',
                );

                // Verify subfield $9 (UUID of linked authority record) - preserved
                const subfield9 = field100.subf.find((s) => s[0] === '9');
                expect(subfield9[1]).to.eq(createdAuthorityID100);
              },

              // Field 700 - Added entry with authority linking
              (record) => {
                const field700 = record.get('700')[0];
                expect(field700.ind1).to.eq('1');
                expect(field700.ind2).to.eq(' ');

                // Verify subfield $e (relator term) - preserved
                const subfieldE = field700.subf.find((s) => s[0] === 'e');
                expect(subfieldE[1]).to.include('letterer');

                // Verify subfield $2 (source of heading) - changed by bulk edit
                const subfield2 = field700.subf.find((s) => s[0] === '2');
                expect(subfield2[1]).to.eq('Source of heading or term');

                // Verify subfield $0 (authority record control number) - preserved
                const subfield0 = field700.subf.find((s) => s[0] === '0');
                expect(subfield0[1]).to.equal('8756792C663255');

                // Verify subfield $9 (UUID of linked authority record) - preserved
                const subfield9 = field700.subf.find((s) => s[0] === '9');
                expect(subfield9[1]).to.eq(createdAuthorityID700);
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

        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 9: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          `${authorityHeadingToLink100Field}; ${authorityHeadingToLink700Field}`,
        );

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          `${authorityHeadingToLink100Field}; ${authorityHeadingToLink700Field}`,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 11: Download changed records in MARC format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 12: Download changed records in CSV format
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          `${authorityHeadingToLink100Field}; ${authorityHeadingToLink700Field}`,
        );

        // Step 13: Verify changes in Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyContributorWithMarcAppLink(0, 1, authorityHeadingToLink100Field);
        InventoryInstance.verifyContributorWithMarcAppLink(1, 1, authorityHeadingToLink700Field);
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.verifyInstanceRecordViewOpened();

        // Step 14: View source and verify MARC changes
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '100',
          `$a ${authorityHeadingToLink100Field} $e interviewer. $0 http://id.loc.gov/authorities/names/n2008001084C663255 $4 org $9 ${createdAuthorityID100}`,
        );
        InventoryViewSource.verifyFieldInMARCBibSource(
          '700',
          `$a ${authorityHeadingToLink700Field} $e letterer. $0 8756792C663255 $2 Source of heading or term $9 ${createdAuthorityID700}`,
        );
        InventoryViewSource.verifyLinkedToAuthorityIcon(4);
        InventoryViewSource.verifyLinkedToAuthorityIcon(6);
        InventoryViewSource.close();

        // Step 15: Edit MARC bibliographic record and verify linking
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterLinking(
          4,
          '100',
          '1',
          '\\',
          `$a ${authorityHeadingToLink100Field}`,
          '$e interviewer.',
          '$0 http://id.loc.gov/authorities/names/n2008001084C663255',
          '$4 org',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          6,
          '700',
          '1',
          '\\',
          `$a ${authorityHeadingToLink700Field}`,
          '$e letterer.',
          '$0 8756792C663255',
          '$2 Source of heading or term',
        );
      },
    );
  });
});
