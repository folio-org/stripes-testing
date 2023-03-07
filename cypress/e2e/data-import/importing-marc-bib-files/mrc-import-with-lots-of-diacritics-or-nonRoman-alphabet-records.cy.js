import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('ui-data-import', () => {
  const quantityOfItems = '1';
  const nameMarcFileForCreate = `C356830 autotestFile.${getRandomPostfix()}.mrc`;

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
  });

  it('C6709 Import a file with lots of diacritics or non-Roman alphabet records (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // upload a marc file for creating of the new instance
      cy.visit(TopMenu.dataImportPath);
      DataImport.uploadFile('**.mrc', nameMarcFileForCreate);
      JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForCreate);
      Logs.openFileDetails(nameMarcFileForCreate);
      [FileDetails.columnName.srsMarc, FileDetails.columnName.instance].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 0);
      FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 0);
      FileDetails.openInstanceInInventory('Created');
    });
});
