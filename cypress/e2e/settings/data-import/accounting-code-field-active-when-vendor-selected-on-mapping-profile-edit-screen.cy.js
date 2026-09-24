import { BATCH_GROUP, FOLIO_RECORD_TYPE, PAYMENT_METHOD } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const postfix = getRandomPostfix();
    const organizationName = `AT_C380509_Vendor_${postfix}`;
    const accountingCode = `AT_C380509_Code_${postfix}`;
    const accordionName = 'Vendor information';
    const fieldName = 'Accounting code';
    const mappingProfile = {
      name: `AT_C380509_MappingProfile_${postfix}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      batchGroup: BATCH_GROUP.FOLIO,
      organizationName,
      paymentMethod: PAYMENT_METHOD.CASH,
    };

    let organizationId;
    let user;

    before('Create vendor organization with default accounting code, login', () => {
      cy.getAdminToken();
      // No "accounts" are added on the organization - a default accounting code (erpCode) with
      // no other/differing accounting code value anywhere on the org is what keeps the
      // "Accounting code" field in the "active + pre-filled with default" state under test
      Organizations.createOrganizationViaApi({
        ...NewOrganization.getDefaultOrganization(),
        name: organizationName,
        erpCode: accountingCode,
      }).then((id) => {
        organizationId = id;
      });

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      FieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Organizations.deleteOrganizationViaApi(organizationId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380509 Verify that Accounting code field is active when vendor is selected on existing Invoice edit screen (promin)',
      { tags: ['extendedPath', 'promin', 'C380509'] },
      () => {
        // Steps 1-3: duplicate "Default - GOBI monograph invoice" profile; set name/batch
        // group/vendor/payment method; Accounting code gets auto-populated with the org's default
        FieldMappingProfiles.createInvoiceMappingProfile(
          mappingProfile,
          FieldMappingProfiles.mappingProfileForDuplicate.gobi,
        );
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name, {
          closeView: false,
        });
        FieldMappingProfileView.verifyValueByAccordionAndSection(
          accordionName,
          fieldName,
          `"${accountingCode}"`,
        );

        // Step 4: Actions > Edit
        FieldMappingProfileView.edit();

        // Step 5: "Accounting code" field in "Vendor information" accordion is active/editable
        NewFieldMappingProfile.verifyFieldEnabled(accordionName, fieldName);
        NewFieldMappingProfile.verifyFieldValue(accordionName, fieldName, `"${accountingCode}"`);

        // Step 6: "Accepted values" dropdown shows the list of accounting codes
        NewFieldMappingProfile.openAccountingCodeAcceptedValues();
        NewFieldMappingProfile.getAcceptedValuesDropdownItems().should(
          'include',
          `Default (${accountingCode})`,
        );
      },
    );
  });
});
