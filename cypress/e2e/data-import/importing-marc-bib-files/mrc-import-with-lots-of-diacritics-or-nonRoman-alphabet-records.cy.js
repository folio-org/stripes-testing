import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('ui-data-import', () => {
  const quantityOfItems = '15';
  const rowNumbers = [3, 6, 9, 10];
  const instanceSource = 'MARC';
  const instanceHrids = [];
  const nameMarcFileForCreate = `C6709 autotestFile.${getRandomPostfix()}.mrc`;

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
  });

  it('C6709 Import a file with lots of diacritics or non-Roman alphabet records (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // upload a marc file for creating of the new instance
      cy.visit(TopMenu.dataImportPath);
      DataImport.uploadFile('mrcFileForC6709.mrc', nameMarcFileForCreate);
      JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForCreate);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(nameMarcFileForCreate);
      rowNumbers.forEach(rowNumber => {
        cy.wait(1000);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.srsMarc, rowNumber);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.instance, rowNumber);
      });
      FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
      FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);


      rowNumbers.forEach(rowNumber => {
        // need to wait until page will be opened in loop
        cy.wait(1500);
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(nameMarcFileForCreate);
        FileDetails.openInstanceInInventory('Created', rowNumber);
        InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
          instanceHrids.push(initialInstanceHrId);
        });
        InstanceRecordView.verifyInstanceSource(instanceSource);
      });
    });
});
