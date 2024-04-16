import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    let instanceId;
    const filePathToUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const uniquePartOfFileName = getRandomPostfix();
    const uniqueFileName = `C380637 autotestFileName${uniquePartOfFileName}.mrc`;

    before('create test data', () => {
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
        cy.login(user.username, user.password);
      });
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C380637 Job profile: verify that file name in job profile detail view is a hotlink for job log details (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.search(jobProfileToRun);
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyJobsUsingThisProfileSection(uniqueFileName);
        JobProfileView.openLogDetailsPageView(uniqueFileName);
        FileDetails.verifyLogDetailsPageIsOpened(uniqueFileName);
      },
    );
  });
});
