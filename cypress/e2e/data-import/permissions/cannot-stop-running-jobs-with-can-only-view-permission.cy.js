import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Permissions', () => {
    let userA;
    let userB;
    const filePath = 'marcBibFileForC356788.mrc';
    const marcFileName = `C356788 autotestFileName ${getRandomPostfix()}`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';

    before('create test data', () => {
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

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
    });

    it(
      'C356788 A user cannot stop running jobs with "Data import: Can view only" permission (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        DataImport.checkIsLandingPageOpened();
        Logs.checkFileIsRunning(marcFileName);
        DataImport.verifyTrashIconInvisibleForUser(userA);
      },
    );
  });
});
