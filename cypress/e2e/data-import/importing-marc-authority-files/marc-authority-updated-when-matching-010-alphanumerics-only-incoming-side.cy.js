import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const searchOption = 'Keyword';
    const letterPrefix = getRandomLetters(9);
    const randomDigits = `1505063${randomNDigitNumber(9)}`;
    const seed010Value = `${letterPrefix}${randomDigits}`;
    // Same digits, with an internal space - only matches because "Alphanumerics only" is
    // configured on the incoming side; the existing side has no qualifier at all
    const update010Value = `${letterPrefix} ${randomDigits}`;
    const baseHeadingValue = `AT_C1505063_MarcAuthority_${randomPostfix}`;
    const updatedHeadingValue = `${baseHeadingValue} UPDATED`;

    // Reused as a template - editFields overwrites by tag regardless of the template's own content
    const templateFileName = 'marcAuthFileForC1505063.mrc';
    const editedCreateFileName = `AT_C1505063_CreateFile_${randomPostfix}.mrc`;
    const editedUpdateFileName = `AT_C1505063_UpdateFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1505063 FMP MARC Authority Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1505063 AP MARC Authority Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C1505063 MP MARC Authority 010 $a ${randomPostfix}`,
      incomingRecordFields: { field: '010', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '010', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      // Asymmetric: only the incoming side strips non-alphanumerics; the existing side has no
      // qualifier at all
      incomingQualifier: { comparisonPart: 'ALPHANUMERICS_ONLY' },
      existingQualifier: {},
    };
    const jobProfile = { profileName: `AT_C1505063 JP MARC Authority Update ${randomPostfix}` };

    const testData = { user: {} };
    let createdAuthorityId;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1505063_');
        // Update job profile chain: FMP -> AP -> MP -> JP, matching on 010 $a with
        // "Alphanumerics only" configured on the incoming side only
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
          .then(({ body }) => NewActionProfile.createActionProfileViaApi(actionProfile, body.id))
          .then((apResponse) => {
            const apId = apResponse.body.id;
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            ).then((mpResponse) => NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              mpResponse.body.id,
              apId,
            ));
          });

        // Prepare both files from the template - placeholders replaced with unique 001/010/100
        // content; the update file's heading is the same base value with "UPDATED" appended
        DataImport.editMarcFieldsInAllRecords(templateFileName, editedCreateFileName, {
          editFields: [
            { tag: '001', content: `1505063${randomDigits}` },
            { tag: '010', content: `$a ${seed010Value}` },
            { tag: '100', content: `$a ${baseHeadingValue}` },
          ],
        });
        DataImport.editMarcFieldsInAllRecords(templateFileName, editedUpdateFileName, {
          editFields: [
            { tag: '001', content: `1505063${randomDigits}` },
            { tag: '010', content: `$a ${update010Value}` },
            { tag: '100', content: `$a ${updatedHeadingValue}` },
          ],
        });

        // Seed the original authority record via API import
        DataImport.uploadFileViaApi(
          editedCreateFileName,
          editedCreateFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          createdAuthorityId = response[0].authority.id;
        });
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiDataImport,
            CapabilitySets.uiDataImportSettingsManage,
            CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
          ],
        );
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedCreateFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedUpdateFileName}`);
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId);
    });

    it(
      'C1505063 MARC authority record is updated when matching on 010 $a with "Alphanumerics only" configured on the incoming side only (promin)',
      { tags: ['criticalPath', 'promin', 'C1505063'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });

        // Step 3: original authority record's MARC source shows the seeded 010 $a value
        MarcAuthorities.searchBy(searchOption, baseHeadingValue);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(seed010Value);
        MarcAuthorities.clickResetAndCheck();

        // Step 4: import the incoming file (010 $a differs only by an internal space) with the
        // Update job profile from preconditions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(editedUpdateFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Authority both show "Updated" - the incoming-side
        // "Alphanumerics only" qualifier ignores the whitespace difference, so the record is
        // matched and updated, not duplicated
        Logs.waitFileIsImported(editedUpdateFileName);
        Logs.checkJobStatus(editedUpdateFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedUpdateFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        // Step 6: searching by the stable base heading returns exactly one record (proves no
        // duplicate was created - a wrongly-created duplicate would also match this search, since
        // it would carry the "...UPDATED" heading which still contains the base text), and that
        // record now shows the updated 010 $a and heading
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBy(searchOption, baseHeadingValue);
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(update010Value);
        MarcAuthority.contains(updatedHeadingValue);
      },
    );
  });
});
