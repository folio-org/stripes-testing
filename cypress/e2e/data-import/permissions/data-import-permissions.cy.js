import { Permissions } from '../../../support/dictionary';
import { RECORD_STATUSES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Data Import', () => {
  describe('Permissions', () => {
    let user;
    let instanceIds;
    const fileName = `oneMarcBib${getRandomPostfix()}.mrc`;

    before('create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi1(
        'oneMarcBib.mrc',
        fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        instanceIds = response;
      });

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

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instanceIds.forEach((record) => {
        InventoryInstance.deleteInstanceViaApi(record.instance.id);
      });
    });

    it('C492 Data Import permissions (folijet)', { tags: ['extendedPath', 'folijet'] }, () => {
      DataImport.waitLoading();
      Logs.openFileDetails(fileName);
      FileDetails.checkStatusInColumn(
        RECORD_STATUSES.CREATED,
        FileDetails.columnNameInResultList.instance,
      );
      cy.visit(SettingsMenu.marcFieldProtectionPath);
      MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
      MarcFieldProtection.clickNewButton();
      MarcFieldProtection.cancel();
    });
  });
});
