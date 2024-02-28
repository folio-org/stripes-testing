// import { Permissions } from '../../../support/dictionary';
// import { RECORD_STATUSES } from '../../../support/constants';
import DataImportCopy from '../../../support/fragments/data_import/dataImportCopy';
// import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
// import Logs from '../../../support/fragments/data_import/logs/logs';
// import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
// import SettingsMenu from '../../../support/fragments/settingsMenu';
// import TopMenu from '../../../support/fragments/topMenu';
// import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
// import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('data-import', () => {
  describe('Permissions', () => {
    // let user;
    // let instanceId;
    const fileName = `oneMarcBib${getRandomPostfix()}.mrc`;

    before('create test data', () => {
      cy.getAdminToken();
      DataImportCopy.uploadFileViaApi(
        'oneMarcBib.mrc',
        fileName,
        'Default - Create instance and SRS MARC Bib',
      ).then((response) => {
        console.log(response.entries[0].relatedInstanceInfo.idList[0]);
        // instanceHrid = response.entries[0].relatedInstanceInfo.hridList[0];
      });
      // DataImportCopy.uploadFileViaApi(
      //   'oneMarcBib.mrc',
      //   fileName,
      //   'Default - Create instance and SRS MARC Bib',
      // ).then((response) => {
      //   console.log(response.entries[0].relatedInstanceInfo.idList[0]);
      //   // instanceId = response.entries[0].relatedInstanceInfo.idList[0];
      // });

      // cy.createTempUser([
      //   Permissions.moduleDataImportEnabled.gui,
      //   Permissions.settingsDataImportEnabled.gui,
      // ]).then((userProperties) => {
      //   user = userProperties;

      //   cy.login(user.username, user.password, {
      //     path: TopMenu.dataImportPath,
      //     waiter: DataImport.waitLoading,
      //   });
      // });
    });

    // after('delete test data', () => {
    //   cy.getAdminToken();
    //   Users.deleteViaApi(user.userId);
    //   InventoryInstance.deleteInstanceViaApi(instanceId);
    // });

    it('C492 Data Import permissions (folijet)', { tags: ['extendedPath', 'folijet'] }, () => {
      // cy.visit(TopMenu.dataImportPath);
      // DataImport.waitLoading();
      // Logs.openFileDetails(fileName);
      // FileDetails.checkStatusInColumn(
      //   RECORD_STATUSES.CREATED,
      //   FileDetails.columnNameInResultList.instance,
      // );
      // cy.visit(SettingsMenu.marcFieldProtectionPath);
      // MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
      // MarcFieldProtection.clickNewButton();
      // MarcFieldProtection.cancel();
    });
  });
});
