import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  MATCH_PROFILE_QUALIFIER_TYPES,
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
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const searchOption = 'Keyword';
    const randomDigits = `1505058${randomNDigitNumber(9)}`;
    const qualifierPrefix = '(OCoLC)ocn';
    // Both existing 035 occurrences look like OCLC numbers, but only the first begins with the
    // configured qualifier prefix - the second uses a different (but similar-looking) prefix
    const matchingOclcValue = `${qualifierPrefix}${randomDigits}`;
    const nonMatchingOclcValue = `(OCoLC)ocm${randomDigits}`;
    const baseHeadingValue = `AT_C1505058_MarcAuthority_${randomPostfix}`;
    const updatedHeadingValue = `${baseHeadingValue} UPDATED`;

    // Reused as a template - editFields/addFields overwrite by tag regardless of the template's
    // own content; this barebone template has no 035, so it's appended via addFields
    const templateFileName = 'marcAuthFileForC1528150.mrc';
    const editedCreateFileName = `AT_C1505058_CreateFile_${randomPostfix}.mrc`;
    const editedUpdateFileName = `AT_C1505058_UpdateFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1505058 FMP MARC Authority Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1505058 AP MARC Authority Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C1505058 MP MARC Authority 035 $a ${randomPostfix}`,
      incomingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      // Symmetric: "Begins with" qualifier configured on both sides, no comparison-part
      qualifier: {
        qualifierType: MATCH_PROFILE_QUALIFIER_TYPES.BEGINS_WITH,
        qualifierValue: qualifierPrefix,
      },
    };
    const jobProfile = { profileName: `AT_C1505058 JP MARC Authority Update ${randomPostfix}` };

    const testData = { user: {} };
    let createdAuthorityId;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1505058_');
        // Update job profile chain: FMP -> AP -> MP -> JP, matching on 035 $a with a
        // "Begins with" qualifier configured on both sides
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

        // Prepare both files from the template - unique 001/100 content, and 035 field(s)
        // appended (the template has none). The seed record gets a SECOND 035 occurrence that
        // does not begin with the qualifier prefix, so only the first is the actual match
        DataImport.editMarcFieldsInAllRecords(templateFileName, editedCreateFileName, {
          editFields: [
            { tag: '001', content: randomDigits },
            { tag: '100', content: `$a ${baseHeadingValue}` },
          ],
          addFields: [
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${matchingOclcValue}` },
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${nonMatchingOclcValue}` },
          ],
        });
        DataImport.editMarcFieldsInAllRecords(templateFileName, editedUpdateFileName, {
          editFields: [
            { tag: '001', content: randomDigits },
            { tag: '100', content: `$a ${updatedHeadingValue}` },
          ],
          addFields: [{ tag: '035', indicators: ['\\', '\\'], content: `$a ${matchingOclcValue}` }],
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
      'C1505058 MARC authority record is updated when matching on 035 $a using a "Begins with" qualifier only (no "Only compare part of the value") (promin)',
      { tags: ['extendedPath', 'promin', 'C1505058'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });

        // Step 3: original authority record's MARC source shows both seeded 035 $a values
        MarcAuthorities.searchBy(searchOption, baseHeadingValue);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(matchingOclcValue);
        MarcAuthority.contains(nonMatchingOclcValue);
        MarcAuthorities.clickResetAndCheck();

        // Step 4: import the incoming file (035 $a matches only the first existing occurrence)
        // with the Update job profile from preconditions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(editedUpdateFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Authority both show "Updated" - the "Begins with"
        // qualifier identifies the matching occurrence, so the record is updated, not duplicated
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
        // duplicate was created), and that record's heading now shows the "UPDATED" suffix
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBy(searchOption, baseHeadingValue);
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(updatedHeadingValue);
      },
    );
  });
});
