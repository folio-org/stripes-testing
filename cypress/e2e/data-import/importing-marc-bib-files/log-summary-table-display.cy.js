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

        FileDetails.verifyColumnValuesInSummaryTable(
          FileDetails.visibleColumnsInSummaryTable.SUMMARY.columnIndex,
          ['Created', 'Updated', 'No action', 'Error'],
        );
        FileDetails.verifyColumnValuesInSummaryTable(
          FileDetails.visibleColumnsInSummaryTable.SRS_MARC.columnIndex,
          ['103', '0', '0', '0'],
        );
        FileDetails.verifyColumnValuesInSummaryTable(
          FileDetails.visibleColumnsInSummaryTable.INSTANCE.columnIndex,
          ['103', '0', '0', '0'],
        );
        FileDetails.verifyColumnValuesInSummaryTable(
          FileDetails.visibleColumnsInSummaryTable.HOLDINGS.columnIndex,
          ['No value set-', 'No value set-', 'No value set-', 'No value set-'],
        );
        FileDetails.verifyColumnValuesInSummaryTable(
          FileDetails.visibleColumnsInSummaryTable.ITEM.columnIndex,
          ['No value set-', 'No value set-', 'No value set-', 'No value set-'],
        );
        FileDetails.verifyColumnValuesInSummaryTable(
          FileDetails.visibleColumnsInSummaryTable.ORDER.columnIndex,
          ['No value set-', 'No value set-', 'No value set-', 'No value set-'],
        );
        FileDetails.verifyColumnValuesInSummaryTable(
          FileDetails.visibleColumnsInSummaryTable.INVOICE.columnIndex,
          ['No value set-', 'No value set-', 'No value set-', 'No value set-'],
        );
        FileDetails.verifyColumnValuesInSummaryTable(
          FileDetails.visibleColumnsInSummaryTable.ERROR.columnIndex,
          ['No value set-', 'No value set-', 'No value set-', '0'],
        );
        FileDetails.clickNextPaginationButton();
        FileDetails.verifyLogDetailsPageIsOpened();
        FileDetails.verifyLogSummaryTableIsDisplayed();
        FileDetails.clickPreviousPaginationButton();
        FileDetails.verifyLogDetailsPageIsOpened();
        FileDetails.verifyLogSummaryTableIsDisplayed();
      },
    );
  });
});
