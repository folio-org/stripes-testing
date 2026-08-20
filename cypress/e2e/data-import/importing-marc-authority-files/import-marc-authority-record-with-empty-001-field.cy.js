import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const marcFileName = 'marcAuthFileForC1322892.mrc';
    const uploadedFileName = `C1322892_marcAuthFile_${randomPostfix}.mrc`;
    const authorityHeading = 'C1322892_MarcAuthority';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
    // eslint-disable-next-line
    const error =
      'org.folio.processing.exceptions.EventProcessingException: {"errors":[{"message":"createAuthorityIfValid.authorityDto.identifiers[0].value: must not be null","code":"validation","parameters":[{"key":"createAuthorityIfValid.authorityDto.identifiers[0].value","value":"null"}],"type":"ConstraintViolationImpl"}],"total_records":1}';

    let user;

    before('Create user', () => {
      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          user.userId,
          [],
          [CapabilitySets.uiDataImport, CapabilitySets.uiMarcAuthoritiesAuthorityRecordView],
        );
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(authorityHeading);
    });

    it(
      'C1322892 Import "MARC authority" record with empty "001" field (promin)',
      { tags: ['extendedPath', 'promin', 'C1322892'] },
      () => {
        // Step 1: Import .mrc file with empty 001 field using Create Authority profile
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFileName, uploadedFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(uploadedFileName);
        Logs.checkJobStatus(uploadedFileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);

        // Steps 2-3: Open log details; click record title → Authority tab → verify error
        Logs.openFileDetails(uploadedFileName);

        FileDetails.openJsonScreen(authorityHeading);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openAuthorityTab();
        JsonScreenView.verifyContentInTab(error);

        // Step 4: Navigate to MARC Authority app and verify record was not created
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.waitLoading();
        MarcAuthorities.searchBeats(authorityHeading);
        MarcAuthorities.verifyEmptySearchResults(authorityHeading);
      },
    );
  });
});
