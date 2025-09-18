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

let user;
let createdAuthorityID800;
let createdAuthorityID830;
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const marcInstance = {
  title: `AT_C663266_MarcInstance_${getRandomPostfix()}`,
};
const authorityHeadingToLink800Field = 'AT_C663266_Robinson, Peter 1950-2022';
const authorityHeadingToLink830Field =
  'AT_C663266_Cambridge tracts in mathematics and mathematical physics';
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '800',
    content: `$a ${authorityHeadingToLink800Field} $c Inspector Banks series $v 24. $y 2023 $8 800`,
    indicators: ['1', '\\'],
  },
  {
    tag: '830',
    content: `$a ${authorityHeadingToLink830Field} $l english $v no. 19.`,
    indicators: ['\\', '0'],
  },
];
const marcAuthFiles = [
  {
    marc: 'marcAuthFileC663266_1.mrc',
    fileName: `testMarcAuthC663266File_800.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    fieldTag: '800',
  },
  {
    marc: 'marcAuthFileC663266_2.mrc',
    fileName: `testMarcAuthC663266File_830.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    fieldTag: '830',
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
        permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C663266');

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
                  if (authFile.fieldTag === '800') {
                    createdAuthorityID800 = record.authority.id;
                  } else if (authFile.fieldTag === '830') {
                    createdAuthorityID830 = record.authority.id;
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

            // Link field 800 to authority
            InventoryInstance.verifyAndClickLinkIcon('800');
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(authorityHeadingToLink800Field);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority('800');

            // Link field 830 to authority
            InventoryInstance.verifyAndClickLinkIcon('830');
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(authorityHeadingToLink830Field);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority('830');
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

      [createdAuthorityID800, createdAuthorityID830].forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C663266 Bulk edit read-only subfield (0) of marc fields (800, 830) linked to authority record (firebird)',
      { tags: ['criticalPath', 'firebird', 'C663266'] },
      () => {
        // Step 1: Check "Series statements" checkbox to show column
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
          `${authorityHeadingToLink800Field} Inspector Banks series 24. | ${authorityHeadingToLink830Field} english no. 19.`,
        );

        // Step 2: Uncheck "Series statements" checkbox to hide column
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          false,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
        );

        // Step 3: Open MARC bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 4: Configure 800 field subfield 0 - Find and Remove subfield
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('800', '1', '\\', '0');
        BulkEditActions.findAndRemoveSubfieldActionForMarc('3052044C663266');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Add new row for 830 field subfield 0 - Find and Replace
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('830', '\\', '0', '0', 1);
        BulkEditActions.findAndReplaceWithActionForMarc('n84801249C663266', 'n84801250C663266', 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Confirm changes and verify "Are you sure?" form
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
          `${authorityHeadingToLink800Field} Inspector Banks series 24. | ${authorityHeadingToLink830Field} english no. 19.`,
        );

        // Step 7: Download preview in MARC format
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
        BulkEditActions.downloadPreviewInMarcFormat();

        const assertionsOnPreviewMarcFileContent = [
          {
            uuid: marcInstance.id,
            assertions: [
              // Field 800 - Series added entry with authority linking (preview shows changes)
              (record) => {
                const field800 = record.get('800')[0];
                expect(field800.ind1).to.eq('1');
                expect(field800.ind2).to.eq(' ');

                // Verify subfield $a (name) - preserved
                const subfieldA = field800.subf.find((s) => s[0] === 'a');
                expect(subfieldA[1]).to.eq('AT_C663266_Robinson, Peter');

                // Verify subfield $c (title of work) - preserved
                const subfieldC = field800.subf.find((s) => s[0] === 'c');
                expect(subfieldC[1]).to.eq('Inspector Banks series');

                // Verify subfield $v (volume number) - preserved
                const subfieldV = field800.subf.find((s) => s[0] === 'v');
                expect(subfieldV[1]).to.eq('24.');

                // Verify subfield $y (chronological subdivision) - preserved
                const subfieldY = field800.subf.find((s) => s[0] === 'y');
                expect(subfieldY[1]).to.eq('2023');

                // Verify subfield $0 (authority record control number) - should be removed in preview
                const subfield0 = field800.subf.find((s) => s[0] === '0');
                if (subfield0) {
                  expect.fail('Subfield $0 should not exist in field 800');
                }

                // Verify subfield $9 (UUID of linked authority record) - preserved in preview
                const subfield9 = field800.subf.find((s) => s[0] === '9');
                expect(subfield9[1]).to.eq(createdAuthorityID800);

                // Verify subfield $8 (field link and sequence number) - preserved
                const subfield8 = field800.subf.find((s) => s[0] === '8');
                expect(subfield8[1]).to.eq('800');
              },

              // Field 830 - Series added entry uniform title with authority linking
              (record) => {
                const field830 = record.get('830')[0];
                expect(field830.ind1).to.eq(' ');
                expect(field830.ind2).to.eq('0');

                // Verify subfield $a (uniform title) - preserved
                const subfieldA = field830.subf.find((s) => s[0] === 'a');
                expect(subfieldA[1]).to.eq(authorityHeadingToLink830Field);

                // Verify subfield $l (language) - preserved
                const subfieldL = field830.subf.find((s) => s[0] === 'l');
                expect(subfieldL[1]).to.eq('english');

                // Verify subfield $v (volume number) - preserved
                const subfieldV = field830.subf.find((s) => s[0] === 'v');
                expect(subfieldV[1]).to.eq('no. 19.');

                // Verify subfield $0 (authority record control number) - changed by bulk edit
                const subfield0 = field830.subf.find((s) => s[0] === '0');
                expect(subfield0[1]).to.eq('http://id.loc.gov/authorities/names/n84801250C663266');

                // Verify subfield $9 (UUID of linked authority record) - preserved in preview
                const subfield9 = field830.subf.find((s) => s[0] === '9');
                expect(subfield9[1]).to.eq(createdAuthorityID830);
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
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
          `${authorityHeadingToLink800Field} Inspector Banks series 24. | ${authorityHeadingToLink830Field} english no. 19.`,
        );

        // Step 9: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
          `${authorityHeadingToLink800Field} Inspector Banks series 24. | ${authorityHeadingToLink830Field} english no. 19.`,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 10: Download changed records in MARC format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        const assertionsOnChangedMarcFileContent = [
          {
            uuid: marcInstance.id,
            assertions: [
              // Field 800 - Series added entry NOT linked to authority record after bulk edit
              (record) => {
                const field800 = record.get('800')[0];
                expect(field800.ind1).to.eq('1');
                expect(field800.ind2).to.eq(' ');

                // Verify subfield $a (name) - preserved
                const subfieldA = field800.subf.find((s) => s[0] === 'a');
                expect(subfieldA[1]).to.eq('AT_C663266_Robinson, Peter');

                // Verify subfield $c (title of work) - preserved
                const subfieldC = field800.subf.find((s) => s[0] === 'c');
                expect(subfieldC[1]).to.eq('Inspector Banks series');

                // Verify subfield $v (volume number) - preserved
                const subfieldV = field800.subf.find((s) => s[0] === 'v');
                expect(subfieldV[1]).to.eq('24.');

                // Verify subfield $y (chronological subdivision) - preserved
                const subfieldY = field800.subf.find((s) => s[0] === 'y');
                expect(subfieldY[1]).to.eq('2023');

                // Verify subfield $0 (authority record control number) - removed
                const subfield0 = field800.subf.find((s) => s[0] === '0');
                if (subfield0) {
                  expect.fail('Subfield $0 should not exist in field 800');
                }

                // Verify subfield $9 (UUID of linked authority record) - removed (field no longer linked)
                const subfield9 = field800.subf.find((s) => s[0] === '9');
                if (subfield9) {
                  expect.fail('Subfield $9 should not exist in field 800');
                }

                // Verify subfield $8 (field link and sequence number) - preserved
                const subfield8 = field800.subf.find((s) => s[0] === '8');
                expect(subfield8[1]).to.eq('800');
              },

              // Field 830 - Series added entry NOT linked to authority record after bulk edit
              (record) => {
                const field830 = record.get('830')[0];
                expect(field830.ind1).to.eq(' ');
                expect(field830.ind2).to.eq('0');

                // Verify subfield $a (uniform title) - preserved
                const subfieldA = field830.subf.find((s) => s[0] === 'a');
                expect(subfieldA[1]).to.eq(authorityHeadingToLink830Field);

                // Verify subfield $l (language) - preserved
                const subfieldL = field830.subf.find((s) => s[0] === 'l');
                expect(subfieldL[1]).to.eq('english');

                // Verify subfield $v (volume number) - preserved
                const subfieldV = field830.subf.find((s) => s[0] === 'v');
                expect(subfieldV[1]).to.eq('no. 19.');

                // Verify subfield $0 (authority record control number) - changed by bulk edit
                const subfield0 = field830.subf.find((s) => s[0] === '0');
                expect(subfield0[1]).to.eq('http://id.loc.gov/authorities/names/n84801250C663266');

                // Verify subfield $9 (UUID of linked authority record) - removed (field no longer linked)
                const subfield9 = field830.subf.find((s) => s[0] === '9');
                if (subfield9) {
                  expect.fail('Subfield $9 should not exist in field 830');
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
          fileNames.changedRecordsMarc,
          assertionsOnChangedMarcFileContent,
          1,
        );

        // Step 11: Download changed records in CSV format
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
          `${authorityHeadingToLink800Field} Inspector Banks series 24. | ${authorityHeadingToLink830Field} english no. 19.`,
        );

        // Step 12: Verify changes in Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.verifyInstanceRecordViewOpened();

        // Verify Series statements are NOT linked to MARC Authority
        InventoryInstance.verifySeriesStatement(
          0,
          `${authorityHeadingToLink800Field} Inspector Banks series 24.`,
        );
        InventoryInstance.verifySeriesStatement(
          1,
          `${authorityHeadingToLink830Field} english no. 19.`,
        );

        // Step 13: View source and verify MARC changes - fields are NOT linked
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '800',
          '$a AT_C663266_Robinson, Peter $d 1950-2022 $c Inspector Banks series $v 24. $y 2023 $8 800',
        );
        InventoryViewSource.verifyFieldInMARCBibSource(
          '830',
          `$a ${authorityHeadingToLink830Field} $l english $v no. 19. $0 http://id.loc.gov/authorities/names/n84801250C663266`,
        );

        // Verify fields are NOT linked to authority (no linking icons)
        InventoryViewSource.verifyLinkedToAuthorityIcon(4, false);
        InventoryViewSource.verifyLinkedToAuthorityIcon(5, false);
        InventoryViewSource.close();

        // Step 14: Edit MARC bibliographic record and verify fields are NOT linked
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldNotLinked(
          5,
          '800',
          '1',
          '\\',
          '$a AT_C663266_Robinson, Peter $d 1950-2022 $c Inspector Banks series $v 24. $y 2023 $8 800',
        );
        QuickMarcEditor.verifyTagFieldNotLinked(
          6,
          '830',
          '\\',
          '0',
          `$a ${authorityHeadingToLink830Field} $l english $v no. 19. $0 http://id.loc.gov/authorities/names/n84801250C663266`,
        );

        // Verify no linking icons are present for fields 800 and 830
        QuickMarcEditor.verifyRowLinked(5, false);
        QuickMarcEditor.verifyRowLinked(6, false);
      },
    );
  });
});
