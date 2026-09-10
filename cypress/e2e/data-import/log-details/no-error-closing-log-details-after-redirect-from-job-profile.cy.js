import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    let instanceId;
    const filePathToUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const uniqueFileName = `AT_C398013_importedFile_${getRandomPostfix()}.mrc`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(filePathToUpload, uniqueFileName, jobProfileToRun).then(
        (response) => {
          instanceId = response[0].instance.id;
        },
      );

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C398013 Verify that no error appears when trying to close log details page after redirecting to Data import app from Job profiles page (promin)',
      { tags: ['extendedPath', 'promin', 'C398013'] },
      () => {
        // Step 1: Open log details for the imported file
        Logs.openFileDetails(uniqueFileName);
        FileDetails.verifyLogDetailsPageIsOpened(uniqueFileName);

        // Steps 2-3: Go to Settings > Data import > Job profiles - open the job profile used for import
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.search(jobProfileToRun);
        JobProfileView.verifyJobProfileOpened();

        // Step 4: Click the import job hotlink in "Jobs using this profile" - Log details opens
        JobProfileView.verifyJobsUsingThisProfileSection(uniqueFileName);
        JobProfileView.openLogDetailsPageView(uniqueFileName);
        FileDetails.verifyLogDetailsPageIsOpened(uniqueFileName);

        // Step 5: Close Log details - no error, back on the Job profile details page
        FileDetails.close();
        JobProfileView.verifyJobProfileOpened();
        cy.wait(2000); // wait in case error appears later
        JobProfileView.verifyJobProfileOpened();

        // Step 6: Go to Data import app - Log details for the same record is still shown
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.verifyLogDetailsPageIsOpened(uniqueFileName);

        // Step 7: Close Log details - no error, back on the Data import landing page
        FileDetails.close();
        DataImport.waitLoading();
        cy.wait(2000); // wait in case error appears later
        DataImport.waitLoading();
      },
    );
  });
});
