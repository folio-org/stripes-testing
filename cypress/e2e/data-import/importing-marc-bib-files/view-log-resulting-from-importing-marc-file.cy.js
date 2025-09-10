import { DEFAULT_JOB_PROFILE_NAMES, RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let preconditionUserId;
    let instanceId;
    const filePathToUpload = 'oneMarcBib.mrc';
    const fileNameToUpload = `C2358 autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

    before('Create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        preconditionUserId = userProperties.userId;

        DataImport.uploadFileViaApi(filePathToUpload, fileNameToUpload, jobProfileToRun).then(
          (response) => {
            instanceId = response[0].instance.id;
          },
        );
      });

      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(preconditionUserId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C2358 View the log resulting from importing a MARC file (folijet)',
      { tags: ['extendedPath', 'folijet', 'C2358'] },
      () => {
        cy.wait(2000);
        Logs.openFileDetails(fileNameToUpload);
        FileDetails.verifyLogDetailsPageIsOpened(fileNameToUpload);
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
