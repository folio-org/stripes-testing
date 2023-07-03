import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';

describe('ui-data-import', () => {
  const filePathForUpload = 'oneMarcBib.mrc';
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  
  before(() => {
    cy.loginAsAdmin();
  });

  it('C6707 Import a bunch of MARC files at once (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      [
        {
          fileName: `C6707autotestFiles${getRandomPostfix()}`,
          quantityOfFiles: '2'
        },
        {
          fileName: `C6707autotestFiles${getRandomPostfix()}`,
          quantityOfFiles: '4'
        },
        {
          fileName: `C6707autotestFiles${getRandomPostfix()}`,
          quantityOfFiles: '15'
        }
      ].forEach(upload => {
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadBunchOfFiles(filePathForUpload, upload.quantityOfFiles, upload.fileName);
        // TODO wait until the file will be uploaded
        cy.wait(8000);
        JobProfiles.searchJobProfileForImport(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(upload.fileName);
  
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.selectOption('Keyword (ID, File name)');
        LogsViewAll.searchWithTerm(upload.fileName);
        LogsViewAll.verifyQuantityOfLogs(upload.quantityOfFiles);
      });
    });
});
