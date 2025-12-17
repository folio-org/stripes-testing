import TopMenu from '../../../support/fragments/topMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import ActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';

describe('fse-data-import - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoadingNoInteractors,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195289 - verify that data-import module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'data-import'] },
    () => {
      DataImport.waitLoadingNoInteractors();
    },
  );

  it(
    `TC195767 - check data-import log for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'data-import', 'fse-user-journey', 'nonProd'] },
    () => {
      Logs.openViewAllLogs();
      cy.wait(8000);
      Logs.openFileDetailsByRowNumber();
      DataImport.checkJobSummaryTableExists();
    },
  );

  it(
    `TC195768 - check data-import file upload for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'data-import', 'toBeFixed'] },
    () => {
      // upload small marc file
      const testData = {
        marcFile: {
          marc: 'marcFileForC376006.mrc',
          fileName: `C376006 testMarcFile.${getRandomPostfix()}.mrc`,
        },
      };

      DataImport.uploadFileIfDeleteButtonNotDisplayed(
        testData.marcFile.marc,
        testData.marcFile.fileName,
      );
      JobProfiles.waitLoadingList();
      // delete uploaded file without starting job
      JobProfiles.deleteUploadedFile(testData.marcFile.fileName);
      JobProfiles.verifyDeleteUploadedFileModal();
      JobProfiles.confirmDeleteUploadedFile();
      DataImport.waitLoadingNoInteractors();
    },
  );
});

describe('fse-data-import - UI (data manipulation)', () => {
  const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
  const propertyName = 'authority';
  const createdJobProfile = {
    profileName: `Update MARC authority records - 999 ff $s ${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
  };
  let fileName;
  const createdAuthorityIDs = [];

  beforeEach(() => {
    fileName = `TC123456 testMarcFile.${getRandomPostfix()}.mrc`;
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    // get default Action profile
    ActionProfile.getActionProfilesViaApi({
      query: 'name="Default - Create MARC Authority"',
    }).then(({ actionProfiles }) => {
      // create Job profile
      NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
        createdJobProfile.profileName,
        actionProfiles[0].id,
      );
    });
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoadingNoInteractors,
    });
    cy.allure().logCommandSteps();
  });

  after('Deleting data', () => {
    cy.getAdminToken();
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });

    SettingsJobProfiles.deleteJobProfileByNameViaApi(createdJobProfile.profileName);
  });

  it(
    `TC196048 - verify simple MARC data import for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'data-import', 'fse-user-journey', 'nonProd'] },
    () => {
      DataImport.uploadFileViaApi('test-auth-file.mrc', fileName, jobProfileToRun).then(
        (response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record[propertyName].id);
          });
        },
      );
      Logs.waitFileIsImported(fileName);
      Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(fileName);
      Logs.goToTitleLink(RECORD_STATUSES.CREATED);
      MarcAuthority.contains(ACCEPTED_DATA_TYPE_NAMES.MARC);
    },
  );
});
