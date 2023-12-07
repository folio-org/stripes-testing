import { JOB_STATUS_NAMES, RECORD_STATUSES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathToUpload = 'marcBibFileForC353624.mrc';
    const fileName = `C356324 autotestFile${getRandomPostfix()}.mrc`;

    before('login', () => {
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePathToUpload, fileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
    });

    it(
      'C353624 Check the log summary table display (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const columnNumbers = {
          summary: '1',
          srs: '2',
          instance: '3',
          holdings: '4',
          item: '5',
          authority: '6',
          order: '7',
          invoice: '8',
          error: '9',
        };

        cy.wait(2000);
        Logs.openFileDetails(fileName);
        FileDetails.verifyLogDetailsPageIsOpened(fileName);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.summary, [
          RECORD_STATUSES.CREATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.ERROR,
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.srs, ['103', '0', '0', '0']);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.instance, [
          '103',
          '0',
          '0',
          '0',
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.holdings, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.item, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.order, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.invoice, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.error, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          '0',
        ]);
        FileDetails.clickNextPaginationButton();
        FileDetails.verifyLogDetailsPageIsOpened(fileName);
        FileDetails.verifyLogSummaryTableIsDisplayed();
        FileDetails.clickPreviousPaginationButton();
        FileDetails.verifyLogDetailsPageIsOpened(fileName);
        FileDetails.verifyLogSummaryTableIsDisplayed();
      },
    );
  });
});
