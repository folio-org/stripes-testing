import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../support/utils/stringTools';
import Logs from '../../support/fragments/data_import/logs/logs';
import InteractorsTools from '../../support/utils/interactorsTools';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-data-import: A user can delete import logs with "Data import: Can delete import logs" permission on Landing page', () => {
  let userId = null;
  let fileNameToUpload = '';
  const filePathToUpload = 'oneMarcBib.mrc';
  const emptyFilePathToUpload = 'emptyMarc.mrc';
  const numberOfLogsToDelete = 2;
  const numberOfLogsPerPage = 25;
  const numberOfLogsToUpload = 30;
  const getCalloutSuccessMessage = logsCount => `${logsCount} data import logs have been successfully deleted.`;

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.dataImportDeleteLogs.gui,
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading
        });
      })
      .then(() => {
        DataImport.checkIsLandingPageOpened();

        new Array(numberOfLogsToUpload).fill(null).forEach((_, index) => {
          // as stated in preconditions we need at least 30 logs so,
          // we are uploading 29 empty files and 1 file with content to speed up uploading process
          const filePath = numberOfLogsToUpload - 1 === index ? filePathToUpload : emptyFilePathToUpload;
          fileNameToUpload = `C358137autotestFile.${getRandomPostfix()}.mrc`;
          DataImport.uploadFile(filePath, fileNameToUpload);
          JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
          JobProfiles.runImportFile(fileNameToUpload);
        });
      });
  });

  after(() => {
    Logs.selectAllLogs();
    Logs.actionsButtonClick();
    Logs.deleteAllLogsButtonClick();
    DataImport.confirmDeleteImportLogs();
    Users.deleteViaApi(userId);
  });

  it('C358137 A user can delete import logs with "Data import: Can delete import logs" permission on Landing page (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    Logs.openFileDetails(fileNameToUpload);
    Logs.clickOnHotLink();
    cy.location('pathname').should('include', '/inventory/view');
    cy.visit(TopMenu.dataImportPath);

    DataImport.getLogsHrIdsFromUI(numberOfLogsToDelete).then(logsHrIdsToBeDeleted => {
      // verify that user can cancel deletion of logs
      DataImport.selectAllLogs();
      DataImport.verifyAllLogsCheckedStatus({ logsCount: numberOfLogsPerPage, checked: true });
      DataImport.verifyLogsPaneSubtitleExist(numberOfLogsPerPage);
      DataImport.openDeleteImportLogsModal();
      DataImport.cancelDeleteImportLogs();
      DataImport.verifyAllLogsCheckedStatus({ logsCount: numberOfLogsPerPage, checked: false });
      DataImport.verifyLogsPaneSubtitleAbsent();
      DataImport.verifyDeleteLogsButtonDisabled();

      // verify that user can delete logs
      new Array(numberOfLogsToDelete).fill(null).forEach((_, index) => {
        DataImport.selectLog(index);
      });
      DataImport.verifyLogsPaneSubtitleExist(numberOfLogsToDelete);
      DataImport.openActionsMenu();
      DataImport.openDeleteImportLogsModal();
      DataImport.confirmDeleteImportLogs();
      InteractorsTools.checkCalloutMessage(getCalloutSuccessMessage(numberOfLogsToDelete));
      DataImport.verifyLogsPaneSubtitleAbsent();
      DataImport.verifyDataImportLogsDeleted(logsHrIdsToBeDeleted);
      DataImport.verifyDeleteLogsButtonDisabled();
      cy.reload();
      DataImport.checkMultiColumnListRowsCount(numberOfLogsPerPage);
    });
  });
});
