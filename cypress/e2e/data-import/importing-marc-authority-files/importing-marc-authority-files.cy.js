import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';

describe('data-import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {};
    const jobProfileToRun = 'Default - Create SRS MARC Authority';
    const propertyName = 'relatedAuthorityInfo';
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
      cy.getAdminToken();
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });

      SettingsJobProfiles.deleteJobProfileByNameViaApi(createdJobProfile.profileName);
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C350666 Create a MARC authority record via data import (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        DataImport.uploadFileViaApi('test-auth-file.mrc', fileName, jobProfileToRun).then(
          (response) => {
            response.entries.forEach((record) => {
              createdAuthorityIDs.push(record[propertyName].idList[0]);
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

    it(
      'C350668 Update a MARC authority record via data import. Record match with 999 ff $s (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        DataImport.uploadFileViaApi(
          'test-auth-file-copy.mrc',
          fileName,
          createdJobProfile.profileName,
        ).then((response) => {
          response.entries.forEach((record) => {
            createdAuthorityIDs.push(record[propertyName].idList[0]);
          });
        });
        Logs.waitFileIsImported(fileName);
        Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        Logs.goToTitleLink(RECORD_STATUSES.CREATED);
        MarcAuthority.contains(ACCEPTED_DATA_TYPE_NAMES.MARC);
      },
    );
  });
});
