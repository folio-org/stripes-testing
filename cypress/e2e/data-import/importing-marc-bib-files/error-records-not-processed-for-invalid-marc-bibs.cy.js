import permissions from '../../../support/dictionary/permissions';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Users from '../../../support/fragments/users/users';
import Helper from '../../../support/fragments/finance/financeHelper';
import fileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('ui-data-import:', () => {
  let user;
  // file name
  const nameMarcFileForImportCreate = `C350750autotestFile.${Helper.getRandomBarcode()}.mrc`;
  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading
        });
      });
  });

  //   after(() => {
  //     Users.deleteViaApi(user.userId);
  //   });

  it('C350750 Error records not processed or saved for invalid MARC Bibs (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      DataImport.uploadFile('marcFileForC350750.mrc', nameMarcFileForImportCreate);
      JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForImportCreate);
      Logs.checkStatusOfJobProfile('Completed with errors');
      Logs.openFileDetails(nameMarcFileForImportCreate);
      fileDetails.
    });
});
