import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import DataImport from '../../support/fragments/data_import/dataImport';
import TopMenu from '../../support/fragments/topMenu';
import LogsViewAll from '../../support/fragments/data_import/logs/logsViewAll';
import DateTools from '../../support/utils/dateTools';
import DeleteDataImportLogsModal from '../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-data-import: EDIFACT file import with creating of new invoice record', () => {
  const startedDate = new Date();
  const completedDate = startedDate;
  // format date as YYYY-MM-DD
  const formattedStart = DateTools.getFormattedDate({ date: startedDate });
  // api endpoint expects completedDate increased by 1 day
  completedDate.setDate(completedDate.getDate() + 1);
  let user = {};

  before(() => {
    const nameMarcFileForCreate = `C358136autotestFile.${getRandomPostfix()}.mrc`;

    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.deleteImportLogs.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path: TopMenu.dataImportPath, waiter: DataImport.wailtLoading });
        for (let i = 0; i < 15; i++) {
          cy.visit(TopMenu.dataImportPath);
          DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForCreate);
          JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
          JobProfiles.runImportFile(nameMarcFileForCreate);
          DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForCreate);
          JobProfiles.searchJobProfileForImport('Default - Create Holdings and SRS MARC Holdings');
          JobProfiles.runImportFile(nameMarcFileForCreate);
        }
      });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it('C358136 A user can filter and delete import logs from the "View all" page (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    LogsViewAll.openViewAll();
    LogsViewAll.checkIsViewAllOpened();
    LogsViewAll.filterJobsByDate({ from: formattedStart, end: formattedStart });

    const formattedEnd = DateTools.getFormattedDate({ date: completedDate });

    LogsViewAll.checkByDate({ from: formattedStart, end: formattedEnd })
      .then((count) => {
        LogsViewAll.selectAllLogs();
        LogsViewAll.checkIsLogsSelected(count);
        LogsViewAll.unmarcCheckbox(0);
        LogsViewAll.checkIsCheckmarkAllLogsRemoved();
        LogsViewAll.deleteLog();

        const countOfLogsForDelete = (count - 1);
        DeleteDataImportLogsModal.confirmDelete(countOfLogsForDelete);
        LogsViewAll.verifyMessageOfDeteted(countOfLogsForDelete);
        LogsViewAll.checkIsModalAbsent();
      });
  });
});
