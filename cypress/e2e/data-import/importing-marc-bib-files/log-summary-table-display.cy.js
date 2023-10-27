import { DevTeams, TestTypes } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathToUpload = 'marcBibFileForC353624.mrc';
    const fileName = `C356324 autotestFile.${getRandomPostfix()}.mrc`;

    before('login', () => {
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePathToUpload, fileName);
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
    });

    it(
      'C353624 Check the log summary table display (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        Logs.openFileDetails(fileName);
        FileDetails.verifyLogDetailsPageIsOpened();
        cy.wrap(['Created', 'Updated', 'No action', 'Error']).each((rowValue) => {
          FileDetails.verifyColumnValuesInSummaryTable(
            FileDetails.visibleColumnsInSummaryTable.SUMMARY.columnIndex,
            rowValue,
          );
        });
        cy.wrap(['103', '0', '0', '0']).each((rowValue) => {
          FileDetails.verifyColumnValuesInSummaryTable(
            FileDetails.visibleColumnsInSummaryTable.SRS_MARC.columnIndex,
            rowValue,
          );
        });
        cy.wrap(['103', '0', '0', '0']).each((rowValue) => {
          FileDetails.verifyColumnValuesInSummaryTable(
            FileDetails.visibleColumnsInSummaryTable.INSTANCE.columnIndex,
            rowValue,
          );
        });
        cy.wrap(['-', '-', '-', '-']).each((rowValue) => {
          FileDetails.verifyColumnValuesInSummaryTable(
            FileDetails.visibleColumnsInSummaryTable.HOLDINGS.columnIndex,
            rowValue,
          );
        });
        cy.wrap(['-', '-', '-', '-']).each((rowValue) => {
          FileDetails.verifyColumnValuesInSummaryTable(
            FileDetails.visibleColumnsInSummaryTable.ITEM.columnIndex,
            rowValue,
          );
        });
        cy.wrap(['-', '-', '-', '-']).each((rowValue) => {
          FileDetails.verifyColumnValuesInSummaryTable(
            FileDetails.visibleColumnsInSummaryTable.ORDER.columnIndex,
            rowValue,
          );
        });
        cy.wrap(['-', '-', '-', '-']).each((rowValue) => {
          FileDetails.verifyColumnValuesInSummaryTable(
            FileDetails.visibleColumnsInSummaryTable.INVOICE.columnIndex,
            rowValue,
          );
        });
        cy.wrap(['-', '-', '-', '0']).each((rowValue) => {
          FileDetails.verifyColumnValuesInSummaryTable(
            FileDetails.visibleColumnsInSummaryTable.ERROR.columnIndex,
            rowValue,
          );
        });
        FileDetails.clickNextPaginationButton();
        FileDetails.verifyLogDetailsPageIsOpened();
        FileDetails.clickPreviousPaginationButton();
        FileDetails.verifyLogDetailsPageIsOpened();
      },
    );
  });
});
