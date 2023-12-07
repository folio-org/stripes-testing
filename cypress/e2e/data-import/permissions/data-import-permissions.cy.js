import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Permissions', () => {
    let user;
    const filePathToUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const marcFileName = `C17019 oneMarcBib${getRandomPostfix()}.mrc`;

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it('C492 Data Import permissions (folijet)', { tags: ['extendedPath', 'folijet'] }, () => {
      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoading();
      Logs.openFileDetails(marcFileName);
      FileDetails.checkStatusInColumn(
        FileDetails.status.created,
        FileDetails.columnNameInResultList.instance,
      );
      cy.visit(SettingsMenu.marcFieldProtectionPath);
      MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
      MarcFieldProtection.clickNewButton();
      MarcFieldProtection.cancel();
    });
  });
});
