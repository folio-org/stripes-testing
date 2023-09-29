import { DevTeams, TestTypes } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  PAYMENT_METHOD,
  BATCH_GROUP,
  ACCEPTED_DATA_TYPE_NAMES,
  VENDOR_NAMES,
} from '../../../support/constants';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
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
      'C17026 Create, edit, and delete field protection settings (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.marcFieldProtectionPath);
        MarcFieldProtection.verifyListOfExistingProfilesIsDisplayed();
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
