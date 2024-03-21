import { RECORD_STATUSES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceId;
    const filePathToUpload = 'oneMarcBib.mrc';
    const fileNameToUpload = `C2358 autotestFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';

    before('create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(filePathToUpload, fileNameToUpload, jobProfileToRun).then(
        (response) => {
          instanceId = response[0].instance.id;
        },
      );

      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C2358 View the log resulting from importing a MARC file (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        Logs.openFileDetails(fileNameToUpload);
        FileDetails.verifyLogDetailsPageIsOpened();
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
      },
    );
  });
});
