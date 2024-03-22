import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    let instanceId;
    const filePathToUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const fileNameToUpload = `C380637autotestFile${getRandomPostfix()}.mrc`;

    before('create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(filePathToUpload, fileNameToUpload, jobProfileToRun).then(
        (response) => {
          instanceId = response.entries[0].relatedInstanceInfo.idList[0];
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
        JobProfileView.verifyJobsUsingThisProfileSection(fileNameToUpload);
        JobProfileView.openLogDetailsPageView(fileNameToUpload);
        FileDetails.verifyLogDetailsPageIsOpened(fileNameToUpload);
      },
    );
  });
});
