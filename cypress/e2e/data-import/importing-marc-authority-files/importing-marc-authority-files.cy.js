import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { ACCEPTED_DATA_TYPE_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('Importing MARC Authority files', { retries: 2 }, () => {
    const testData = {};
    const jobProfileToRun = 'Default - Create SRS MARC Authority';
    const createdJobProfile = {
      profileName: 'Update MARC authority records - 999 ff $s',
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    let fileName;
    const createdAuthorityIDs = [];

    before('Creating data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
      });

      cy.loginAsAdmin({
        path: SettingsMenu.jobProfilePath,
        waiter: JobProfiles.waitLoadingList,
      }).then(() => {
        JobProfiles.createJobProfile(createdJobProfile);
        NewJobProfile.linkActionProfileByName('Default - Create MARC Authority');
        NewJobProfile.saveAndClose();
      });
    });

    beforeEach('Login to the application', () => {
      fileName = `testMarcFile.${getRandomPostfix()}.mrc`;

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });

    after('Deleting data', () => {
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });

      JobProfiles.deleteJobProfile(createdJobProfile.profileName);
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C350666 Create a MARC authority record via data import (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        DataImport.uploadFile('test-auth-file.mrc', fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdAuthorityIDs.push(link.split('/')[5]);
        });
        Logs.goToTitleLink('Created');
        MarcAuthority.contains(ACCEPTED_DATA_TYPE_NAMES.MARC);
      },
    );

    it(
      'C350668 Update a MARC authority record via data import. Record match with 999 ff $s (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        DataImport.uploadFile('test-auth-file.mrc', fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(createdJobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdAuthorityIDs.push(link.split('/')[5]);
        });
        Logs.goToTitleLink('Created');
        MarcAuthority.contains(ACCEPTED_DATA_TYPE_NAMES.MARC);
      },
    );
  });
});
