import getRandomPostfix from '../../../support/utils/stringTools';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathToUpload = 'marcBibFileForC10923.mrc';
    const fileName = `C10923 autotestFile${getRandomPostfix()}.mrc`;
    const titles = {
      instanceTitle: 'Justus Liebigs Annalen der Chemie.',
      precedingTitles: "Justus Liebig's Annalen der Chemie und Pharmacie",
      succeedingTitles: 'Liebigs Annalen der Chemie',
    };

    before('create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    });

    it(
      'C10923 Check the default mapping of Preceding/Succeeding titles from the MARC record to the Inventory Instance record (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory('Created');
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.verifyPrecedingTitle(titles.precedingTitles);
        InstanceRecordView.verifySucceedingTitle(titles.succeedingTitles);
        InstanceRecordView.edit();
        InstanceRecordEdit.verifyAddButtonsDisabledForPrecedingSucceedingTitle();
      },
    );
  });
});
