import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    let instanceId;
    const filePathToUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const uniqueFileName = `AT_C423595_importedFile_${getRandomPostfix()}.mrc`;
    // static title from the oneMarcBib.mrc fixture
    const title =
      'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)';

    before('Create test data and login', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(filePathToUpload, uniqueFileName, jobProfileToRun).then(
        (response) => {
          instanceId = response[0].instance.id;
        },
      );

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
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
      'C423595 Check log record type tabs in header (promin)',
      { tags: ['extendedPath', 'promin', 'C423595'] },
      () => {
        const message = `Import Log for Record 01 (${title})`;

        // Precondition: display width is 1100 pixels
        cy.viewport(1125, 1080);

        // Step 1: Click the file name of the imported record - Log details page opens
        Logs.openFileDetails(uniqueFileName);
        FileDetails.verifyLogDetailsPageIsOpened(uniqueFileName);

        // Step 2: Click the "Title" hotlink - JSON screen opens with records created by the import job
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();

        // Step 3: Record name + record type tabs are displayed and fit in the header box
        JsonScreenView.verifyContentInTab(message);
        JsonScreenView.verifyTabsPresented();
        JsonScreenView.verifyRecordNameAndTabsFitInHeader();
      },
    );
  });
});
