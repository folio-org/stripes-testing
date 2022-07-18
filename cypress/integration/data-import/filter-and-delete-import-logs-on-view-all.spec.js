import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import DataImport from '../../support/fragments/data_import/dataImport';
import TopMenu from '../../support/fragments/topMenu';
import LogsViewAll from '../../support/fragments/data_import/logs/logsViewAll';
import DateTools from '../../support/utils/dateTools';

describe('ui-data-import: EDIFACT file import with creating of new invoice record', () => {
  const startedDate = new Date();
  const completedDate = startedDate;
  // format date as YYYY-MM-DD
  const formattedStart = DateTools.getFormattedDate({ date: startedDate });
  // api endpoint expects completedDate increased by 1 day
  completedDate.setDate(completedDate.getDate() + 1);
  let user = {};

  before(() => {
    cy.createTempUser([
      permissions.dataImportUploadAll.gui,
      permissions.moduleDataImportEnabled.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path: TopMenu.dataImportPath, waiter: DataImport.wailtLoading });
      });
  });

  after(() => {

  });

  it('A user can filter and delete import logs from the "View all" page (folijet)', { tags: [TestTypes.smoke] }, () => {
    LogsViewAll.openViewAll();
    LogsViewAll.checkIsViewAllOpened();
    LogsViewAll.filterJobsByDate({ from: formattedStart, end: formattedStart });
    const formattedEnd = DateTools.getFormattedDate({ date: completedDate });
    LogsViewAll.checkByDate({ from: formattedStart, end: formattedEnd });
    LogsViewAll.selectAllLogs();
  });
});
