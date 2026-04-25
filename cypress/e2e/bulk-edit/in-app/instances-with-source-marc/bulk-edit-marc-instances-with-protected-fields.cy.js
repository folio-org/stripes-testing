/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import MarcFieldProtection from '../../../../support/fragments/settings/dataImport/marcFieldProtection';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  INSTANCE_NOTE_TYPES,
} from '../../../../support/constants';

let user;
let instanceUUIDsFileName;
let fileNames;
let marcInstance;
let protectedFieldIds;
let marcInstanceFields;

// Define field data (static configuration)
const fieldData = {
  // 562 field - Copy and Version Identification note
  existing_562_e: '3 copies kept;',
  existing_562_b:
    "Labelled as president's desk copy, board of directors' working file copy, and public release copy.",
  new_562_a: "Annotation in Wilson's hand: Copy one of two sent to John Phipps, 27 March 1897;",

  // 505 0\ field - Formatted Contents Note
  existing_505_0_a: 'pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals.',
  existing_505_0_g: '(1:57) --',
  append_505_0_g: '(10:49).',

  // 505 00 field - Formatted Contents Note
  existing_505_00_a: '"Table of statutes and regulations": p. xvii-xxv.',
  existing_505_00_t: 'Quatrain II',
  append_505_00_g: 'Nr. 3.',

  // 520 \\ field - Summary
  existing_520_a:
    'Papers "originally commissioned as course material for a series of continuing legal education seminars"-- Pref., v. 1.',

  // 520 0\ field - Summary
  existing_520_0_a:
    '"Combines the most frequently asked questions regarding AIDS with the most prominent US physician, former Surgeon General C. Everett Koop, resulting in an informative 38-minute production"--Video rating guide for libraries, winter 1990.',
  existing_520_0_u: 'http://www.ojp.usdoj.gov/bjs/abstract/cchrie98.htm',

  // 932 1\ field - Local note
  existing_932_1_a: 'Inaccessible',
  existing_932_1_3: 'Images of text',

  // 942 0\ field - Local note
  existing_942_0_a: 'Goldie, James',
  existing_942_0_n: 'Copyright not renewed',
  existing_942_0_r: 'US',
  replace_942_0_r: 'United States',

  // 926 0\ field - Study Program Information
  existing_926_0_a_1: 'Study program name',
  existing_926_0_a_2: 'Upper Grades',
  existing_926_0_x: 'January 1999 selection',
};

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Instances with source MARC', () => {
      beforeEach('create test data', () => {
        cy.clearLocalStorage();

        // Recreate dynamic variables with fresh values for each retry
        instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
        marcInstance = {
          title: `AT_C569592_MarcInstance_${getRandomPostfix()}`,
        };
        protectedFieldIds = [];

        // Create MARC instance fields with fresh data
        marcInstanceFields = [
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
            tag: '562',
            content: `$e ${fieldData.existing_562_e} $b ${fieldData.existing_562_b}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '505',
            content: `$a ${fieldData.existing_505_0_a} $g ${fieldData.existing_505_0_g}`,
            indicators: ['0', '\\'],
          },
          {
            tag: '505',
            content: `$a ${fieldData.existing_505_00_a} $t ${fieldData.existing_505_00_t}`,
            indicators: ['0', '0'],
          },
          {
            tag: '520',
            content: `$a ${fieldData.existing_520_a}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '520',
            content: `$a ${fieldData.existing_520_0_a} $u ${fieldData.existing_520_0_u} $u ${fieldData.existing_520_0_u}`,
            indicators: ['0', '\\'],
          },
          {
            tag: '932',
            content: `$a ${fieldData.existing_932_1_a} $3 ${fieldData.existing_932_1_3}`,
            indicators: ['1', '\\'],
          },
          {
            tag: '932',
            content: `$a ${fieldData.existing_932_1_a}`,
            indicators: ['1', '\\'],
          },
          {
            tag: '942',
            content: `$a ${fieldData.existing_942_0_a} $n ${fieldData.existing_942_0_n} $n ${fieldData.existing_942_0_n} $r ${fieldData.existing_942_0_r}`,
            indicators: ['0', '\\'],
          },
          {
            tag: '926',
            content: `$a ${fieldData.existing_926_0_a_1}`,
            indicators: ['0', '\\'],
          },
          {
            tag: '926',
            content: `$a ${fieldData.existing_926_0_a_2} $x ${fieldData.existing_926_0_x}`,
            indicators: ['0', '\\'],
          },
        ];

        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Create MARC field protection rules
          const protectionRules = [
            { field: '562', indicator1: '*', indicator2: '*', subfield: '*', data: '*' },
            { field: '505', indicator1: '0', indicator2: '*', subfield: '*', data: '*' },
            { field: '520', indicator1: '*', indicator2: '*', subfield: '*', data: '*' },
            { field: '932', indicator1: '*', indicator2: '*', subfield: 'a', data: '*' },
            {
              field: '942',
              indicator1: '0',
              indicator2: '*',
              subfield: 'r',
              data: fieldData.existing_942_0_r,
            },
            { field: '926', indicator1: '*', indicator2: '*', subfield: '*', data: '*' },
          ];

          protectionRules.forEach((rule) => {
            MarcFieldProtection.createViaApi(rule).then((response) => {
              protectedFieldIds.push(response.id);
            });
          });

          // Create MARC instance with all fields
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            marcInstance.uuid = instanceId;

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;
            });

            // Create CSV file with instance UUID
            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, marcInstance.uuid);
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);

        // Delete all protection rules
        protectedFieldIds.forEach((id) => {
          if (id) MarcFieldProtection.deleteViaApi(id);
        });

        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C569592 Verify bulk edit actions with protected MARC fields (firebird)',
        { tags: ['extendedPath', 'firebird', 'C569592', 'nonParallel'] },
        () => {
          // Step 1: Check "Source" column checkbox
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            'MARC',
          );

          // Step 2: Uncheck "Action note" column checkbox
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
          );

          // Step 3: Open combined bulk edit form for MARC instances
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
          BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
            instanceUUIDsFileName,
            '1 instance',
          );

          // Step 4: Add 562 \\ $a field (NON-PROTECTED - should be added)
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('562', '\\', '\\', 'a');
          BulkEditActions.selectActionForMarcInstance('Add');
          BulkEditActions.fillInDataTextAreaForMarcInstance(fieldData.new_562_a);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 5: Append to 505 0\ field (PROTECTED - should NOT apply)
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('505', '0', '\\', 'a', 1);
          BulkEditActions.findAndAppendActionForMarc(
            fieldData.existing_505_0_a,
            'g',
            fieldData.append_505_0_g,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 6: Append to 505 00 field (PROTECTED - should NOT apply)
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('505', '0', '0', 't', 2);
          BulkEditActions.findAndAppendActionForMarc(
            fieldData.existing_505_00_t,
            'g',
            fieldData.append_505_00_g,
            2,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 7: Remove subfield from 520 \\ field (PROTECTED - should NOT apply)
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('520', '\\', '\\', 'a', 3);
          BulkEditActions.findAndRemoveSubfieldActionForMarc(fieldData.existing_520_a, 3);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Remove subfield from 520 0\ field (PROTECTED - should NOT apply)
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(3);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('520', '0', '\\', 'u', 4);
          BulkEditActions.findAndRemoveSubfieldActionForMarc(fieldData.existing_520_0_u, 4);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Remove field 932 1\ (PROTECTED - should NOT apply)
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(4);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('932', '1', '\\', 'a', 5);
          BulkEditActions.findAndRemoveFieldActionForMarc(fieldData.existing_932_1_a, 5);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 10: Replace in 942 0\ field (PROTECTED - should NOT apply)
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(5);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('942', '0', '\\', 'r', 6);
          BulkEditActions.findAndReplaceWithActionForMarc(
            fieldData.existing_942_0_r,
            fieldData.replace_942_0_r,
            6,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 11: Remove all 926 0\ fields (PROTECTED - should NOT apply)
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(6);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('926', '0', '\\', 'a', 7);
          BulkEditActions.selectActionForMarcInstance('Remove all', 7);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 12: Confirm changes and verify "Are you sure?" form
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Verify preview shows desirable changes
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            'Copy and Version Identification note',
            `${fieldData.new_562_a} | ${fieldData.existing_562_e} ${fieldData.existing_562_b}`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
            `${fieldData.existing_505_0_a} ${fieldData.existing_505_0_g} ${fieldData.append_505_0_g} | ${fieldData.existing_505_00_a} ${fieldData.existing_505_00_t} ${fieldData.append_505_00_g}`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
            fieldData.existing_520_0_a,
          );

          // Step 13: Download preview in MARC format
          BulkEditActions.downloadPreviewInMarcFormat();

          // Verify preview MARC file shows INTENDED changes
          const previewAssertions = [
            {
              uuid: marcInstance.uuid,
              assertions: [
                // Index 4: 505 0\ - Should show appended subfield g in preview
                (record) => {
                  expect(record.fields[4]).to.deep.eq([
                    '505',
                    '0 ',
                    'a',
                    fieldData.existing_505_0_a,
                    'g',
                    fieldData.existing_505_0_g,
                    'g',
                    fieldData.append_505_0_g,
                  ]);
                },
                // Index 5: 505 00 - Should show appended subfield g in preview
                (record) => {
                  expect(record.fields[5]).to.deep.eq([
                    '505',
                    '00',
                    'a',
                    fieldData.existing_505_00_a,
                    't',
                    fieldData.existing_505_00_t,
                    'g',
                    fieldData.append_505_00_g,
                  ]);
                },
                // Index 6: 520 0\ - Should show unchanged field (protected, but removal not applied)
                (record) => {
                  expect(record.fields[6]).to.deep.eq([
                    '520',
                    '0 ',
                    'a',
                    fieldData.existing_520_0_a,
                  ]);
                },
                // Index 7: 562 \\ - New added field with $a
                (record) => {
                  expect(record.fields[7]).to.deep.eq(['562', '  ', 'a', fieldData.new_562_a]);
                },
                // Index 8: 562 \\ - Existing field with $e and $b
                (record) => {
                  expect(record.fields[8]).to.deep.eq([
                    '562',
                    '  ',
                    'e',
                    fieldData.existing_562_e,
                    'b',
                    fieldData.existing_562_b,
                  ]);
                },
                // Index 9: 942 0\ - Should show replaced value in preview
                (record) => {
                  expect(record.fields[9]).to.deep.eq([
                    '942',
                    '0 ',
                    'a',
                    fieldData.existing_942_0_a,
                    'n',
                    fieldData.existing_942_0_n,
                    'n',
                    fieldData.existing_942_0_n,
                    'r',
                    fieldData.replace_942_0_r,
                  ]);
                },
                // Verify fields that should NOT exist in preview (removed in intended changes)
                (record) => {
                  // 520 \\ should be removed (not present in preview)
                  const field520Blank = record.fields.find((f) => f[0] === '520' && f[1] === '  ');
                  expect(field520Blank).to.be.undefined;

                  // 932 1\ fields should be removed (not present in preview)
                  const field932 = record.fields.find((f) => f[0] === '932');
                  expect(field932).to.be.undefined;

                  // 926 0\ fields should be removed (not present in preview)
                  const field926 = record.fields.find((f) => f[0] === '926');
                  expect(field926).to.be.undefined;
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, previewAssertions, 1);

          // Step 14: Download preview in CSV format
          BulkEditActions.downloadPreview();

          // Verify preview CSV shows desirable changes in Notes column
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstance.uuid,
            'Notes',
            `Copy and Version Identification note;${fieldData.new_562_a};false | Copy and Version Identification note;${fieldData.existing_562_e} ${fieldData.existing_562_b};false | Formatted Contents Note;${fieldData.existing_505_0_a} ${fieldData.existing_505_0_g} ${fieldData.append_505_0_g};false | Formatted Contents Note;${fieldData.existing_505_00_a} ${fieldData.existing_505_00_t} ${fieldData.append_505_00_g};false | Summary;${fieldData.existing_520_0_a};false`,
          );

          // Step 15: Commit changes
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

          // In test case automated actual view of these fields in form - need to ask question if step in TestRail should be updated
          // Verify "Preview of record changed" shows updated records
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            'Copy and Version Identification note',
            `${fieldData.existing_562_e} ${fieldData.existing_562_b} | ${fieldData.new_562_a}`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
            `${fieldData.existing_505_0_a} ${fieldData.existing_505_0_g} | ${fieldData.existing_505_0_a} ${fieldData.existing_505_0_g} ${fieldData.append_505_0_g} | ${fieldData.existing_505_00_a} ${fieldData.existing_505_00_t} | ${fieldData.existing_505_00_a} ${fieldData.existing_505_00_t} ${fieldData.append_505_00_g}`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
            `${fieldData.existing_520_a} | ${fieldData.existing_520_0_a} ${fieldData.existing_520_0_u} ${fieldData.existing_520_0_u} | ${fieldData.existing_520_0_a}`,
          );

          // Step 16: Download changed records (MARC)
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          // Verify changed MARC file shows ACTUAL behavior:
          // Protected fields remain unchanged, but NEW fields with attempted changes are ALSO created
          const changedAssertions = [
            {
              uuid: marcInstance.uuid,
              assertions: [
                // Verify 520 \\ field - Original protected field remains (1 instance)
                (record) => {
                  const field520Blank = record.fields.filter(
                    (f) => f[0] === '520' && f[1] === '  ',
                  );
                  expect(field520Blank.length).to.eq(1);
                  expect(field520Blank[0]).to.deep.eq(['520', '  ', 'a', fieldData.existing_520_a]);
                },
                // Verify 505 0\ fields - 2 instances (original protected + new with appended $g)
                (record) => {
                  const field505Ind0Blank = record.fields.filter(
                    (f) => f[0] === '505' && f[1] === '0 ',
                  );
                  expect(field505Ind0Blank.length).to.eq(2);
                  // First instance: Original (protected, unchanged)
                  expect(field505Ind0Blank[0]).to.deep.eq([
                    '505',
                    '0 ',
                    'a',
                    fieldData.existing_505_0_a,
                    'g',
                    fieldData.existing_505_0_g,
                  ]);
                  // Second instance: New field with appended $g
                  expect(field505Ind0Blank[1]).to.deep.eq([
                    '505',
                    '0 ',
                    'a',
                    fieldData.existing_505_0_a,
                    'g',
                    fieldData.existing_505_0_g,
                    'g',
                    fieldData.append_505_0_g,
                  ]);
                },
                // Verify 505 00 fields - 2 instances (original protected + new with appended $g)
                (record) => {
                  const field505Ind00 = record.fields.filter(
                    (f) => f[0] === '505' && f[1] === '00',
                  );
                  expect(field505Ind00.length).to.eq(2);
                  // First instance: Original (protected, unchanged)
                  expect(field505Ind00[0]).to.deep.eq([
                    '505',
                    '00',
                    'a',
                    fieldData.existing_505_00_a,
                    't',
                    fieldData.existing_505_00_t,
                  ]);
                  // Second instance: New field with appended $g
                  expect(field505Ind00[1]).to.deep.eq([
                    '505',
                    '00',
                    'a',
                    fieldData.existing_505_00_a,
                    't',
                    fieldData.existing_505_00_t,
                    'g',
                    fieldData.append_505_00_g,
                  ]);
                },
                // Verify 520 0\ fields - 2 instances (original with $u + new without $u)
                (record) => {
                  const field520Ind0 = record.fields.filter((f) => f[0] === '520' && f[1] === '0 ');
                  expect(field520Ind0.length).to.eq(2);
                  // First instance: Original with both $u subfields (protected, unchanged)
                  expect(field520Ind0[0]).to.deep.eq([
                    '520',
                    '0 ',
                    'a',
                    fieldData.existing_520_0_a,
                    'u',
                    fieldData.existing_520_0_u,
                    'u',
                    fieldData.existing_520_0_u,
                  ]);
                  // Second instance: New field without $u subfields
                  expect(field520Ind0[1]).to.deep.eq([
                    '520',
                    '0 ',
                    'a',
                    fieldData.existing_520_0_a,
                  ]);
                },
                // Verify 562 fields - 2 instances (original + new added field)
                (record) => {
                  const field562 = record.fields.filter((f) => f[0] === '562');
                  expect(field562.length).to.eq(2);
                  // First instance: Original field with $e and $b
                  expect(field562[0]).to.deep.eq([
                    '562',
                    '  ',
                    'e',
                    fieldData.existing_562_e,
                    'b',
                    fieldData.existing_562_b,
                  ]);
                  // Second instance: New added field with $a (NOT protected - successfully added)
                  expect(field562[1]).to.deep.eq(['562', '  ', 'a', fieldData.new_562_a]);
                },
                // Verify 932 1\ fields - 2 instances remain (protected, NOT removed)
                (record) => {
                  const field932 = record.fields.filter((f) => f[0] === '932');
                  expect(field932.length).to.eq(2);
                  expect(field932[0]).to.deep.eq([
                    '932',
                    '1 ',
                    'a',
                    fieldData.existing_932_1_a,
                    '3',
                    fieldData.existing_932_1_3,
                  ]);
                  expect(field932[1]).to.deep.eq(['932', '1 ', 'a', fieldData.existing_932_1_a]);
                },
                // Verify 926 0\ fields - 2 instances remain (protected, NOT removed)
                (record) => {
                  const field926 = record.fields.filter((f) => f[0] === '926');
                  expect(field926.length).to.eq(2);
                  expect(field926[0]).to.deep.eq(['926', '0 ', 'a', fieldData.existing_926_0_a_1]);
                  expect(field926[1]).to.deep.eq([
                    '926',
                    '0 ',
                    'a',
                    fieldData.existing_926_0_a_2,
                    'x',
                    fieldData.existing_926_0_x,
                  ]);
                },
                // Verify 942 0\ fields - 2 instances (original with US + new with United States)
                (record) => {
                  const field942 = record.fields.filter((f) => f[0] === '942');
                  expect(field942.length).to.eq(2);
                  // First instance: Original with $r US (protected, unchanged)
                  expect(field942[0]).to.deep.eq([
                    '942',
                    '0 ',
                    'a',
                    fieldData.existing_942_0_a,
                    'n',
                    fieldData.existing_942_0_n,
                    'n',
                    fieldData.existing_942_0_n,
                    'r',
                    fieldData.existing_942_0_r,
                  ]);
                  // Second instance: New field with replaced $r value
                  expect(field942[1]).to.deep.eq([
                    '942',
                    '0 ',
                    'a',
                    fieldData.existing_942_0_a,
                    'n',
                    fieldData.existing_942_0_n,
                    'n',
                    fieldData.existing_942_0_n,
                    'r',
                    fieldData.replace_942_0_r,
                  ]);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, changedAssertions, 1);

          // Step 17: Download changed records (CSV)
          BulkEditActions.downloadChangedCSV();

          // Verify changed CSV shows ACTUAL changes (with protection applied)
          // Protection creates duplicate fields - original protected fields remain, new fields with changes added
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstance.uuid,
            'Notes',
            `Copy and Version Identification note;${fieldData.existing_562_e} ${fieldData.existing_562_b};false | Copy and Version Identification note;${fieldData.new_562_a};false | Formatted Contents Note;${fieldData.existing_505_0_a} ${fieldData.existing_505_0_g};false | Formatted Contents Note;${fieldData.existing_505_0_a} ${fieldData.existing_505_0_g} ${fieldData.append_505_0_g};false | Formatted Contents Note;${fieldData.existing_505_00_a} ${fieldData.existing_505_00_t};false | Formatted Contents Note;${fieldData.existing_505_00_a} ${fieldData.existing_505_00_t} ${fieldData.append_505_00_g};false | Summary;${fieldData.existing_520_a};false | Summary;${fieldData.existing_520_0_a} ${fieldData.existing_520_0_u} ${fieldData.existing_520_0_u};false | Summary;${fieldData.existing_520_0_a};false`,
          );

          // Step 18: Verify in Inventory UI
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Verify Copy and Version Identification notes (562 fields)
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            INSTANCE_NOTE_TYPES.COPY_AND_VERSION_IDENTIFICATION_NOTE,
            `${fieldData.existing_562_e} ${fieldData.existing_562_b}`.replace(/\.$/, ''),
            0,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            INSTANCE_NOTE_TYPES.COPY_AND_VERSION_IDENTIFICATION_NOTE,
            fieldData.new_562_a,
            1,
          );

          // Verify Formatted Contents Notes (505 fields) - unchanged
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            1,
            'No',
            INSTANCE_NOTE_TYPES.FORMATTED_CONTENTS_NOTE,
            `${fieldData.existing_505_0_a} ${fieldData.existing_505_0_g}`.replace(/\.$/, ''),
            0,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            1,
            'No',
            INSTANCE_NOTE_TYPES.FORMATTED_CONTENTS_NOTE,
            `${fieldData.existing_505_0_a} ${fieldData.existing_505_0_g} ${fieldData.append_505_0_g}`.replace(
              /\.$/,
              '',
            ),
            1,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            1,
            'No',
            INSTANCE_NOTE_TYPES.FORMATTED_CONTENTS_NOTE,
            `${fieldData.existing_505_00_a} ${fieldData.existing_505_00_t}`.replace(/\.$/, ''),
            2,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            1,
            'No',
            INSTANCE_NOTE_TYPES.FORMATTED_CONTENTS_NOTE,
            `${fieldData.existing_505_00_a} ${fieldData.existing_505_00_t} ${fieldData.append_505_00_g}`.replace(
              /\.$/,
              '',
            ),
            3,
          );

          // Verify Summary notes (520 fields) - unchanged
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            2,
            'No',
            INSTANCE_NOTE_TYPES.SUMMARY,
            fieldData.existing_520_a.replace(/\.$/, ''),
            0,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            2,
            'No',
            INSTANCE_NOTE_TYPES.SUMMARY,
            `${fieldData.existing_520_0_a} ${fieldData.existing_520_0_u} ${fieldData.existing_520_0_u}`.replace(
              /\.$/,
              '',
            ),
            1,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            2,
            'No',
            INSTANCE_NOTE_TYPES.SUMMARY,
            `${fieldData.existing_520_0_a}`.replace(/\.$/, ''),
            2,
          );

          // Step 19: View MARC source
          InventoryInstance.viewSource();

          // Verify 562 fields - new field added, existing field remains
          InventoryViewSource.contains(`562\t   \t$a ${fieldData.new_562_a}`);
          InventoryViewSource.contains(
            `562\t   \t$e ${fieldData.existing_562_e} $b ${fieldData.existing_562_b}`,
          );

          // Verify 505 fields - protection creates duplicates (original + new with appended $g)
          // Original 505 0\ field
          InventoryViewSource.contains(
            `505\t0  \t$a ${fieldData.existing_505_0_a} $g ${fieldData.existing_505_0_g}`,
          );
          // New 505 0\ field with appended $g
          InventoryViewSource.contains(
            `505\t0  \t$a ${fieldData.existing_505_0_a} $g ${fieldData.existing_505_0_g} $g ${fieldData.append_505_0_g} `,
          );
          // Original 505 00 field
          InventoryViewSource.contains(
            `505\t0 0\t$a ${fieldData.existing_505_00_a} $t ${fieldData.existing_505_00_t}`,
          );
          // New 505 00 field with appended $g
          InventoryViewSource.contains(
            `505\t0 0\t$a ${fieldData.existing_505_00_a} $t ${fieldData.existing_505_00_t} $g ${fieldData.append_505_00_g}`,
          );

          // Verify 520 fields - protection creates duplicates (original + new without $u)
          // Original 520 \\ field
          InventoryViewSource.contains(`520\t   \t$a ${fieldData.existing_520_a}`);
          // Original 520 0\ field with both $u subfields
          InventoryViewSource.contains(
            `520\t0  \t$a ${fieldData.existing_520_0_a} $u ${fieldData.existing_520_0_u} $u ${fieldData.existing_520_0_u}`,
          );
          // New 520 0\ field without $u subfields
          InventoryViewSource.contains(`520\t0  \t$a ${fieldData.existing_520_0_a}`);

          // Verify 932 fields remain (protected - NOT removed)
          InventoryViewSource.contains(
            `932\t1  \t$a ${fieldData.existing_932_1_a} $3 ${fieldData.existing_932_1_3}`,
          );
          InventoryViewSource.contains(`932\t1  \t$a ${fieldData.existing_932_1_a}`);

          // Verify 942 fields - protection creates duplicate (original with US + new with United States)
          InventoryViewSource.contains(
            `942\t0  \t$a ${fieldData.existing_942_0_a} $n ${fieldData.existing_942_0_n} $n ${fieldData.existing_942_0_n} $r ${fieldData.existing_942_0_r}`,
          );
          InventoryViewSource.contains(
            `942\t0  \t$a ${fieldData.existing_942_0_a} $n ${fieldData.existing_942_0_n} $n ${fieldData.existing_942_0_n} $r ${fieldData.replace_942_0_r}`,
          );

          // Verify 926 fields remain (protected - NOT removed)
          InventoryViewSource.contains(`926\t0  \t$a ${fieldData.existing_926_0_a_1}`);
          InventoryViewSource.contains(
            `926\t0  \t$a ${fieldData.existing_926_0_a_2} $x ${fieldData.existing_926_0_x}`,
          );
        },
      );
    });
  },
);
