import { DevTeams, TestTypes } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';

describe('data-import', () => {
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
    before('login', () => {
      cy.loginAsAdmin();
      cy.getAdminToken();
    });

    after('delete test data', () => {
      MarcFieldProtection.delete(protectedFieldData.protectedField);
      MarcFieldProtection.confirmDelete();
    });

    it(
      'C17016 Create, edit, and delete field protection settings (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.marcFieldProtectionPath);
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
