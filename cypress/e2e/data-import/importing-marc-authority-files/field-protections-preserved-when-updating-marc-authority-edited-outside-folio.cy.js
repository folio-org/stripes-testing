import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

const tags = {
  tag001: '001',
  tag130: '130',
  tag430: '430',
  tag645: '645',
  tag999: '999',
};

// Enumerates the quickMARC editor rows (in DOM order) whose tag matches, returning their row
// indexes - needed because this record has 2 occurrences of 430 (and, after the update, 2
// occurrences of 645), and MarcAuthority.checkInfoButton() needs an explicit rowIndex to target
// one specific occurrence rather than whichever one the interactor picks by default
const getRowIndexesByTag = (tag) =>
  cy.get('div[id=quick-marc-editor-rows]>div[class*=quickMarcEditorRow]').then(($rows) => {
    const indexes = [];
    $rows.each((index, el) => {
      const tagInput = el.querySelector('input[name*=".tag"]');
      if (tagInput && tagInput.value === tag) indexes.push(index);
    });
    return indexes;
  });

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const postfix = getRandomPostfix();

    const authorityTitle = `AT_C358528_MarcAuthority_${postfix}`;
    const variant1 = `AT_C358528_Variant1_${postfix}`;
    const variant2 = `AT_C358528_Variant2_${postfix}`;
    const originalNote = `AT_C358528_Note_${postfix}`;
    const randomLetters = `VLR${getRandomLetters(7)}`;
    // Added via the UI (step 12) - subfield $5 value "VLR..." is itself protected by Protection 1,
    // regardless of which field it appears on
    const noteWithProtectedSubfield = `$a ${originalNote} $5 ${randomLetters}`;

    // "Outside FOLIO" edits applied to the exported file (steps 18-20): 130 is fully protected
    // (Protection 2) so this edit must NOT persist; the existing 645's $5=VLR... is protected
    // (Protection 1) so this edit can't overwrite it in place - a new 645 field is added instead
    const editedTitle = `AT_C358528_MarcAuthority_EDITED_${postfix}`;
    const editedNote = `AT_C358528_Note_EDITED_${postfix}`;

    const exportedFileName = `AT_C358528_ExportedFile_${postfix}.mrc`;
    const editedFileName = `AT_C358528_EditedFile_${postfix}.mrc`;

    const mappingProfile = { name: `AT_C358528 FMP Update MARC authority ${postfix}` };
    const actionProfile = {
      name: `AT_C358528 AP Update MARC authority ${postfix}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_AUTHORITY',
    };
    const matchProfile = {
      profileName: `AT_C358528 MP Update MARC authority by 999 ff $s ${postfix}`,
      incomingRecordFields: { field: tags.tag999, in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: tags.tag999, in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfileName = `AT_C358528 JP Update MARC authority by 999 ff $s ${postfix}`;

    const protections = [
      { field: '*', indicator1: '*', indicator2: '*', subfield: '5', data: randomLetters },
      { field: tags.tag130, indicator1: '*', indicator2: '*', subfield: '*', data: '*' },
      { field: tags.tag430, indicator1: '*', indicator2: '*', subfield: '*', data: '*' },
    ];
    const testData = { user: {} };

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C358528_');

      // Job profile chain for "Update MARC authority records by matching 999 ff $s subfield
      // value": MARC-to-MARC passthrough update, matched by the record's own SRS id
      NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          testData.mappingProfileId = mappingProfileResponse.body.id;
          NewActionProfile.createActionProfileViaApi(actionProfile, testData.mappingProfileId).then(
            (actionProfileResponse) => {
              testData.actionProfileId = actionProfileResponse.body.id;
            },
          );
        },
      );
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile).then(
        (matchProfileResponse) => {
          testData.matchProfileId = matchProfileResponse.body.id;
        },
      );

      // Steps 2-5: create the MARC Authority record directly via API instead of importing a
      // fixture file - 130 (protected), two 430s (protected, variant2 will be removed from the
      // "exported and edited" file in step 19), one 645 (not protected yet - VLR... isn't applied
      // until step 12)
      MarcAuthorities.createMarcAuthorityViaAPI('', `AT_C358528_${postfix}`, [
        { tag: tags.tag130, indicators: ['\\', '\\'], content: `$a ${authorityTitle}` },
        { tag: tags.tag430, indicators: ['\\', '\\'], content: `$a ${variant1}` },
        { tag: tags.tag430, indicators: ['\\', '\\'], content: `$a ${variant2}` },
        { tag: tags.tag645, indicators: ['\\', '\\'], content: `$a ${originalNote}` },
      ]).then((authorityId) => {
        testData.authorityId = authorityId;
      });

      cy.then(() => {
        NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
          jobProfileName,
          testData.matchProfileId,
          testData.actionProfileId,
        ).then((jobProfileId) => {
          testData.jobProfileId = jobProfileId;
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      MarcFieldProtection.deleteProtectedFieldsViaApi(protections.map((p) => p.field));
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      SettingsMatchProfiles.deleteMatchProfileViaApi(testData.matchProfileId);
      SettingsActionProfiles.deleteActionProfileViaApi(testData.actionProfileId);
      SettingsFieldMappingProfiles.deleteMappingProfileViaApi(testData.mappingProfileId);
      if (testData.authorityId) MarcAuthority.deleteViaAPI(testData.authorityId);
      FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
      // "Export selected records (CSV/MARC)" (step 15) also triggers a browser-side CSV
      // download, separate from the .mrc file fetched via downloadExportedMarcFileWithRecordHrid
      FileManager.deleteFileFromDownloadsByMask('QuickAuthorityExport*');
    });

    it(
      'C358528 Test field protections when updating "MARC Authority" record, after editing the record outside of FOLIO (promin)',
      { tags: ['extendedPath', 'promin', 'C358528', 'nonParallel'] },
      () => {
        // Step 1: field protections - any field's $5 subfield with value "VLR...", the whole 130
        // field, and the whole 430 field. Created here (not in before()) since these are
        // system-wide settings affecting every import on the tenant while active - keeping the
        // window as short as possible; after() still cleans them up regardless of how this
        // block ends
        protections.forEach((protection) => {
          MarcFieldProtection.createViaApi({ ...protection, source: 'USER' });
        });

        // Steps 6-9: search for and open the imported record
        MarcAuthorities.searchBeats(authorityTitle);
        MarcAuthorities.selectTitle(authorityTitle);
        MarcAuthority.waitLoading();

        // Step 10: open the record for editing
        MarcAuthority.edit();

        // Step 11: info-popover next to 001, 130, both 430s, and 999 - none of these depend on
        // the $5=VLR... protection, which hasn't been triggered by anything yet
        MarcAuthority.checkInfoButton(tags.tag001);
        MarcAuthority.checkInfoButton(tags.tag130);
        getRowIndexesByTag(tags.tag430).then((indexes) => {
          expect(indexes).to.have.lengthOf(2);
          indexes.forEach((rowIndex) => MarcAuthority.checkInfoButton(tags.tag430, rowIndex));
        });

        MarcAuthority.checkInfoButton(tags.tag999);

        // Step 12: add the protected $5=VLR... subfield to the 645 field
        QuickMarcEditor.updateExistingField(tags.tag645, noteWithProtectedSubfield);

        // Step 13: save - validation may return warnings only, in which case save again
        QuickMarcEditor.pressSaveAndClose();

        // Steps 14-15: select the record and export it
        cy.intercept('/data-export/quick-export').as('getHrid');
        MarcAuthorities.checkSelectAuthorityRecordCheckbox(authorityTitle);
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();

        // Steps 16-17: download the exported ".mrc" file
        cy.wait('@getHrid', { timeout: 15_000 }).then(
          ({
            response: {
              body: { jobExecutionHrId },
            },
          }) => {
            ExportFile.downloadExportedMarcFileWithRecordHrid(jobExecutionHrId, exportedFileName);
          },
        );

        // Steps 18-20: edit the exported file outside of FOLIO - edit 130 (protected, must not
        // persist), delete one of the two 430s (protected, must be restored), edit the
        // protected-subfield 645 to a new $a/$5 (can't overwrite the protected field in place,
        // so a new 645 is added instead)
        cy.then(() => {
          DataImport.editMarcFieldsInAllRecords(exportedFileName, editedFileName, {
            editFields: [
              { tag: tags.tag130, content: `$a ${editedTitle}` },
              { tag: tags.tag645, content: `$a ${editedNote} $5 DLC` },
            ],
            removeFields: [{ tag: tags.tag430, occurrence: 1 }],
          });
        });

        // Step 21: upload the edited file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedFileName);
        JobProfiles.waitFileIsUploaded();

        // Step 22-23: run the "Update MARC authority records by matching 999 ff $s subfield
        // value" job profile
        JobProfiles.search(jobProfileName);
        JobProfiles.runImportFile();

        // Step 24: import completes; SRS MARC and Authority both show "Updated"
        Logs.waitFileIsImported(editedFileName);
        Logs.checkJobStatus(editedFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        // Step 25: open the updated record via the "Updated" hyperlink
        FileDetails.openAuthority(RECORD_STATUSES.UPDATED);
        MarcAuthority.waitLoading();

        // Step 26: open the record for editing again
        MarcAuthority.edit();

        // Step 27: info-popover next to 001, 130, both 430s, one 645 (the original, still
        // holding the protected $5=VLR... value), and 999
        MarcAuthority.checkInfoButton(tags.tag001);
        MarcAuthority.checkInfoButton(tags.tag130);
        getRowIndexesByTag(tags.tag430).then((indexes430) => {
          expect(indexes430).to.have.lengthOf(2);
          indexes430.forEach((rowIndex) => MarcAuthority.checkInfoButton(tags.tag430, rowIndex));

          getRowIndexesByTag(tags.tag645).then((indexes645) => {
            expect(indexes645).to.have.lengthOf(2);
            MarcAuthority.checkInfoButton(tags.tag645, indexes645[0]);
            MarcAuthority.checkInfoButtonAbsentForField(tags.tag645, indexes645[1]);

            MarcAuthority.checkInfoButton(tags.tag999);

            // Step 28: 130 value hasn't updated; both 430s are present (the removed one was
            // restored by its field protection); a new 645 field was created alongside the original
            QuickMarcEditor.checkContentByTag(tags.tag130, `$a ${authorityTitle}`);
            QuickMarcEditor.checkContent(`$a ${variant1}`, indexes430[0]);
            QuickMarcEditor.checkContent(`$a ${variant2}`, indexes430[1]);
            QuickMarcEditor.checkContent(noteWithProtectedSubfield, indexes645[0]);
            QuickMarcEditor.checkContent(`$a ${editedNote} $5 DLC`, indexes645[1]);
          });
        });
      },
    );
  });
});
