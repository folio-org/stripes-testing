import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';

describe('Data Import', () => {
  describe('Settings', () => {
    const protectedFieldData = {
      protectedField: '985',
      in1: '*',
      in2: '*',
      subfield: '*',
      data: '*',
      source: 'User',
    };
    const brockenProtectedField = {
      protectedField: '9861',
      in1: '*',
      in2: '*',
      subfield: '*',
      data: '*',
      source: 'User',
    };
    const newProtectedFieldData = {
      protectedField: '986',
      in1: '*',
      in2: '*',
      subfield: '*',
      data: '*',
      source: 'User',
    };
    const protectedFieldDataForEdit = {
      protectedField: '987',
      in1: '*',
      in2: '*',
      subfield: '*',
      data: '*',
      source: 'User',
    };
    before('Login', () => {
      cy.loginAsAdmin({
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        MarcFieldProtection.delete(protectedFieldData.protectedField);
        MarcFieldProtection.confirmDelete();
      });
    });

    it(
      'C17016 Create, edit, and delete field protection settings (folijet)',
      { tags: ['extendedPath', 'folijet', 'C17016'] },
      () => {
        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MARC_FIELD_PROTECTION);
        MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
        MarcFieldProtection.clickNewButton();
        MarcFieldProtection.verifyNewRow();
        MarcFieldProtection.fillMarcFieldProtection(protectedFieldData);
        MarcFieldProtection.save();
        MarcFieldProtection.verifySettingIsPresent(protectedFieldData);
        MarcFieldProtection.verifySettingsSortingOrder();

        MarcFieldProtection.clickNewButton();
        MarcFieldProtection.fillMarcFieldProtection(brockenProtectedField);
        MarcFieldProtection.verifyErrorMessageIsPresented();
        MarcFieldProtection.isSaveButtonDisabled(true);
        MarcFieldProtection.cancel();
        MarcFieldProtection.verifySettingIsAbsent(brockenProtectedField.protectedField);
        MarcFieldProtection.clickNewButton();
        MarcFieldProtection.fillMarcFieldProtection(newProtectedFieldData);
        MarcFieldProtection.save();
        MarcFieldProtection.verifySettingIsPresent(newProtectedFieldData);

        MarcFieldProtection.edit(newProtectedFieldData.protectedField, protectedFieldDataForEdit);
        MarcFieldProtection.cancel();
        MarcFieldProtection.isEditButtonAbsent();
        MarcFieldProtection.verifySettingIsAbsent(protectedFieldDataForEdit.protectedField);

        MarcFieldProtection.edit(newProtectedFieldData.protectedField, protectedFieldDataForEdit);
        MarcFieldProtection.save();
        MarcFieldProtection.verifySettingIsPresent(protectedFieldDataForEdit);

        MarcFieldProtection.delete(protectedFieldDataForEdit.protectedField);
        MarcFieldProtection.cancelDelete();
        MarcFieldProtection.verifySettingIsPresent(protectedFieldDataForEdit);
        MarcFieldProtection.delete(protectedFieldDataForEdit.protectedField);
        MarcFieldProtection.confirmDelete();
        MarcFieldProtection.verifySettingIsAbsent(protectedFieldDataForEdit.protectedField);
      },
    );
  });
});
