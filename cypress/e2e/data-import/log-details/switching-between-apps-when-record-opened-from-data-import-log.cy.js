import { HTML, including } from '@interactors/html';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const filePathToUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const uniqueFileName = `AT_C411673_importedFile_${getRandomPostfix()}.mrc`;
    // static title from the oneMarcBib.mrc fixture
    const instanceTitle =
      'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)';

    let user;
    let instanceId;

    const checkNoCrash = () => {
      cy.wait(2000); // a crash can appear with a delay
      cy.expect(HTML(including('Something went wrong')).absent());
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(filePathToUpload, uniqueFileName, jobProfileToRun).then(
        (response) => {
          instanceId = response[0].instance.id;
        },
      );

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
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
      'C411673 Verify switching between apps when record opened by hyperlink from "Data import" log (promin)',
      { tags: ['extendedPath', 'promin', 'C411673'] },
      () => {
        // Step 3: Open the imported file's log details
        Logs.openFileDetails(uniqueFileName);
        FileDetails.verifyLogDetailsPageIsOpened(uniqueFileName);

        // Step 4: Click the "Created" hyperlink - redirected to the Instance in Inventory
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.verifyInstanceTitle(instanceTitle);

        // Step 5: Click "Data import" in the nav bar while the instance is still loading -
        // user is redirected back to the Log details page
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.verifyLogDetailsPageIsOpened(uniqueFileName);

        // Step 6: Click "Inventory" in the nav bar - Instance detail view is shown, no crash
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        checkNoCrash();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.verifyInstanceTitle(instanceTitle);
      },
    );
  });
});
