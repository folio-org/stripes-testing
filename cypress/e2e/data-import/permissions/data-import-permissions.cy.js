import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Permissions', () => {
    let user;
    const fileName = `oneMarcBib.mrc${getRandomPostfix()}`;

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        DataImport.uploadFileViaApi('oneMarcBib.mrc', fileName);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C492 Data Import permissions (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(TopMenu.dataImportPath);
        DataImport.waitLoading();
        Logs.openFileDetails(fileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.created,
          FileDetails.columnNameInResultList.instance,
        );
        cy.visit(SettingsMenu.marcFieldProtectionPath);
        MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
        MarcFieldProtection.clickNewButton();
        MarcFieldProtection.cancel();
      },
    );
  });
});
