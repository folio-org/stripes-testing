import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const filePathToUpload = 'marcBibFileForC10923.mrc';
    const fileName = `C10923 autotestFile${getRandomPostfix()}.mrc`;
    const titles = {
      instanceTitle: 'Justus Liebigs Annalen der Chemie.',
      precedingTitles: "Justus Liebig's Annalen der Chemie und Pharmacie",
      succeedingTitles: 'Liebigs Annalen der Chemie',
    };

    before('Login', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    });

    it(
      'C10923 Check the default mapping of Preceding/Succeeding titles from the MARC record to the Inventory Instance record (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.verifyPrecedingTitle(titles.precedingTitles);
        InstanceRecordView.verifySucceedingTitle(titles.succeedingTitles);
        InstanceRecordView.edit();
        InstanceRecordEdit.verifyAddButtonsDisabledForPrecedingSucceedingTitle();
      },
    );
  });
});
