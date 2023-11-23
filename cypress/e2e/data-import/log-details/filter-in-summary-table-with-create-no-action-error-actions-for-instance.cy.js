import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const quantityOfItems = {
      created: '5',
      noAction: '4',
      error: '4',
    };
    const marcFileName = `C357015 autotestFile.${getRandomPostfix()}.mrc`;
    const filePathForUpload = 'marcBibFileForC357015.mrc';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';

    before(() => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C357015 Check the filter in summary table with "create + no action + error" actions for the Instance column (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(marcFileName);

        // check created counter in the Summary table
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems.created, 0);
        // check No action counter in the Summary table
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems.noAction, 2);
        // check Error counter in the Summary table
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems.error, 3);
        FileDetails.filterRecordsWithError(FileDetails.visibleColumnsInSummaryTable.INSTANCE);
        FileDetails.verifyQuantityOfRecordsWithError(quantityOfItems.error);
        FileDetails.verifyLogSummaryTableIsHidden();
      },
    );
  });
});
