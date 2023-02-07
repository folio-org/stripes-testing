/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import DateTools from '../../../support/utils/dateTools';
import DeleteDataImportLogsModal from '../../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DevTeams from '../../../support/dictionary/devTeams';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TestTypes from '../../../support/dictionary/testTypes';

describe('ui-data-import: A user can filter and delete import logs from the "View all" page', () => {
  const startedDate = new Date();
  const completedDate = startedDate;
  // format date as YYYY-MM-DD
  const formattedStart = DateTools.getFormattedDate({ date: startedDate });
  // api endpoint expects completedDate increased by 1 day
  completedDate.setDate(completedDate.getDate() + 1);
  let firstUser;
  let secondUser;
  const jobProfileId = '6eefa4c6-bbf7-4845-ad82-de7fc5abd0e3';

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.dataImportDeleteLogs.gui
    ])
      .then(userProperties => {
        firstUser = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading
        });
        // TODO rewrite upload file by API
        // Log list should contain at least 30-35 import jobs, run by different users, and using different import profiles
        for (let i = 0; i < 17; i++) {
          const nameMarcFileForCreate = `C358136autotestFile.${getRandomPostfix()}.mrc`;

          DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForCreate);
          // need to wait until file will be uploaded in loop
          cy.wait(8000);
          JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(nameMarcFileForCreate);
          Logs.checkStatusOfJobProfile('Completed');
        }
        cy.logout();
      });

    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.dataImportDeleteLogs.gui
    ])
      .then(userProperties => {
        secondUser = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading
        });
        // Log list should contain at least 30-35 import jobs
        for (let i = 0; i < 12; i++) {
          const nameMarcFileForCreate = `C358136autotestFile.${getRandomPostfix()}.mrc`;

          DataImport.uploadFile('oneMarcAuthority.mrc', nameMarcFileForCreate);
          // need to wait until file will be uploaded in loop
          cy.wait(8000);
          JobProfiles.searchJobProfileForImport('Default - Create SRS MARC Authority');
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(nameMarcFileForCreate);
          Logs.checkStatusOfJobProfile('Completed');
        }
      });
  });

  after(() => {
    Users.deleteViaApi(firstUser.userId);
    Users.deleteViaApi(secondUser.userId);
    // TODO delete all created instances and holdings
  });

  it('C358136 A user can filter and delete import logs from the "View all" page (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    LogsViewAll.openViewAll();
    LogsViewAll.viewAllIsOpened();
    LogsViewAll.filterJobsByJobProfile('Default - Create SRS MARC Authority');
    LogsViewAll.filterJobsByDate({ from: formattedStart, end: formattedStart });

    const formattedEnd = DateTools.getFormattedDate({ date: completedDate });

    LogsViewAll.checkByDateAndJobProfile({ from: formattedStart, end: formattedEnd }, jobProfileId)
      .then((count) => {
        LogsViewAll.selectAllLogs();
        LogsViewAll.checkIsLogsSelected(count);
        LogsViewAll.unmarcCheckbox(0);
        LogsViewAll.checkmarkAllLogsIsRemoved();
        LogsViewAll.deleteLog();

        const countOfLogsForDelete = (count - 1);
        DeleteDataImportLogsModal.confirmDelete(countOfLogsForDelete);
        LogsViewAll.verifyMessageOfDeleted(countOfLogsForDelete);
        LogsViewAll.modalIsAbsent();
      });
  });
});
