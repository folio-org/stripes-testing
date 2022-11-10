import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import DataImport from '../../support/fragments/data_import/dataImport';
import TopMenu from '../../support/fragments/topMenu';
import LogsViewAll from '../../support/fragments/data_import/logs/logsViewAll';
import DateTools from '../../support/utils/dateTools';
import DeleteDataImportLogsModal from '../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import DevTeams from '../../support/dictionary/devTeams';
import Logs from '../../support/fragments/data_import/logs/logs';
import TestTypes from '../../support/dictionary/testTypes';

describe('ui-data-import: A user can filter and delete import logs from the "View all" page', () => {
  const startedDate = new Date();
  const completedDate = startedDate;
  // format date as YYYY-MM-DD
  const formattedStart = DateTools.getFormattedDate({ date: startedDate });
  // api endpoint expects completedDate increased by 1 day
  completedDate.setDate(completedDate.getDate() + 1);
  let firstUser;
  let secondUser;

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.deleteImportLogs.gui
    ])
      .then(userProperties => {
        firstUser = userProperties;
        cy.login(userProperties.username, userProperties.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
        // TODO rewrite upload file by API
        // Log list should contain at least 30-35 import jobs, run by different users, and using different import profiles
        for (let i = 0; i < 7; i++) {
          const nameMarcFileForCreate = `C358136autotestFile.${getRandomPostfix()}.mrc`;

          cy.visit(TopMenu.dataImportPath);
          DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForCreate);
          JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
          JobProfiles.runImportFile(nameMarcFileForCreate);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(nameMarcFileForCreate);
        }
        cy.logout();
      });

    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.deleteImportLogs.gui
    ])
      .then(userProperties => {
        secondUser = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading
        });
        // Log list should contain at least 30-35 import jobs
        for (let i = 0; i < 13; i++) {
          const nameMarcFileForCreate = `C358136autotestFile.${getRandomPostfix()}.mrc`;

          cy.visit(TopMenu.dataImportPath);
          DataImport.uploadFile('oneMarcAuthority.mrc', nameMarcFileForCreate);
          JobProfiles.searchJobProfileForImport('Default - Create MARC Authority');
          JobProfiles.runImportFile(nameMarcFileForCreate);
          Logs.openFileDetails(nameMarcFileForCreate);
        }
      });
  });

  after(() => {
    Users.deleteViaApi(firstUser.userId);
    Users.deleteViaApi(secondUser.userId);
    // TODO delete all created instances and holdings
  });
  it('C358136 A user can filter and delete import logs from the "View all" page (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    cy.visit(TopMenu.dataImportPath);
    LogsViewAll.openViewAll();
    LogsViewAll.viewAllIsOpened();
    LogsViewAll.filterJobsByDate({ from: formattedStart, end: formattedStart });

    const formattedEnd = DateTools.getFormattedDate({ date: completedDate });

    LogsViewAll.checkByDate({ from: formattedStart, end: formattedEnd })
      .then((count) => {
        LogsViewAll.selectAllLogs();
        LogsViewAll.checkIsLogsSelected(count);
        LogsViewAll.unmarcCheckbox(0);
        LogsViewAll.checkmarkAllLogsIsRemoved();
        LogsViewAll.deleteLog();

        const countOfLogsForDelete = (count - 1);
        DeleteDataImportLogsModal.confirmDelete(countOfLogsForDelete);
        LogsViewAll.verifyMessageOfDeteted(countOfLogsForDelete);
        LogsViewAll.modalIsAbsent();
      });
  });
});
