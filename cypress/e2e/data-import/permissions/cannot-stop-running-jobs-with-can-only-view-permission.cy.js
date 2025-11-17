import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Permissions', () => {
    let userA;
    let userB;
    const filePath = 'marcBibFileForC356788.mrc';
    const marcFileName = `C356788 autotestFileName${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

    before('Create users and login', () => {
      cy.createTempUser([Permissions.settingsDataImportView.gui]).then((userProperties) => {
        userA = userProperties;
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userB = userProperties;

        cy.login(userB.username, userB.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete users', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
    });

    it(
      'C356788 A user cannot stop running jobs with "Data import: Can view only" permission (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C356788'] },
      () => {
        // upload a marc file
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        DataImport.checkIsLandingPageOpened();
        Logs.checkFileIsRunning(marcFileName);

        cy.login(userA.username, userA.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        DataImport.verifyTrashIconInvisibleForUser();
      },
    );
  });
});
