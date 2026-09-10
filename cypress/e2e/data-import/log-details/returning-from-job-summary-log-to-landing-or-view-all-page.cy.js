import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const filePathToUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const uniqueFileName = `AT_C343272_importedFile_${getRandomPostfix()}.mrc`;

    let user;
    let instanceId;

    before('Create test data and login', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(filePathToUpload, uniqueFileName, jobProfileToRun).then(
        (response) => {
          instanceId = response[0].instance.id;
        },
      );

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      "C343272 Test returning from a job's summary log to the Data import landing page or View all page (promin)",
      { tags: ['extendedPath', 'promin', 'C343272'] },
      () => {
        // Step 1: On the Data Import landing page (opened on login)

        // Step 2: Open a file's import summary log from the landing page log list
        Logs.openFileDetails(uniqueFileName);
        FileDetails.verifyLogDetailsPageIsOpened(uniqueFileName);

        // Step 3: Close the summary log - back on the Data Import landing page
        FileDetails.close();
        DataImport.waitLoading();

        // Step 4: Open the "View all" page
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();

        // Step 5: Open a file's import summary log from the "View all" list
        LogsViewAll.openFileDetails(uniqueFileName);
        FileDetails.verifyLogDetailsPageIsOpened(uniqueFileName);

        // Step 6: Close the summary log - back on the "View all" page
        FileDetails.close();
        LogsViewAll.viewAllIsOpened();
      },
    );
  });
});
