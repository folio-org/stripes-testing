import { DEFAULT_JOB_PROFILE_NAMES, RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Permissions', () => {
    let user;
    let instanceId;
    const fileName = `C492 marcFileName${getRandomPostfix()}.mrc`;

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        DataImport.uploadFileViaApi(
          'oneMarcBib.mrc',
          fileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          instanceId = response[0].instance.id;
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
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
