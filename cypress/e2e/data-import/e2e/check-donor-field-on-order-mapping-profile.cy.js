import { Permissions } from '../../../support/dictionary';
import {
  ACQUISITION_METHOD_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import {
  FieldMappingProfiles,
  FieldMappingProfileView,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let user = null;

    const organization = NewOrganization.getDefaultOrganization({
      isDonor: true,
      isVendor: false,
    });

    const mappingProfile = {
      name: `C543842 Test order field mapping profile${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.OPEN,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
      receivingWorkflow: 'Synchronized',
      physicalUnitPrice: '"20"',
      quantityPhysical: '"1"',
      currency: 'USD',
      donor: [{ value: '"Amazon.com"', existingStatus: false }],
    };

    const secondDonor = { value: organization.name, existingStatus: true, index: 1 };

    const fields = [
      {
        accordion: 'Cost details',
        fieldName: 'Electronic unit price',
      },
      {
        accordion: 'Cost details',
        fieldName: 'Quantity electronic',
      },
      {
        accordion: 'Physical resource details',
        fieldName: 'Create inventory',
      },
      {
        accordion: 'E-resources details',
        fieldName: 'Create inventory',
      },
      {
        accordion: 'E-resources details',
        fieldName: 'Material type',
      },
    ];

    before('Create test data and login', () => {
      cy.getAdminToken();
      Organizations.createOrganizationViaApi(organization);
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        Organizations.deleteOrganizationViaApi(organization.id);
      });
    });

    it(
      'C543842 Check "Donor" information field for order field mapping profile (folijet)',
      { tags: ['edgeCases', 'folijet', 'C543842'] },
      () => {
        // Step 1: Open "New field mapping profile" page
        FieldMappingProfiles.openNewMappingProfileForm();

        // Step 2: Populate fields and verify some fields are disabled and empty
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfile);
        fields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });

        // Step 3-5: Check "Donor information" accordion between "PO line details" and "Vendor" accordions
        NewFieldMappingProfile.verifyDonorInformationAccordionVisibility();

        // Step 6-7: Change the value in "Donor" field with incorrect value and save
        NewFieldMappingProfile.changeDonorInformationField(0, '"Amazon.com');
        NewFieldMappingProfile.verifyDonorInformationFieldError(0, false);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.verifyDonorInformationFieldError(0, true);

        // Step 8-12: Set valid donor name and choose the second donor from the list and save
        NewFieldMappingProfile.changeDonorInformationField(0, '"Amazon.com"');
        NewFieldMappingProfile.addDonor({ donor: [secondDonor] });
        NewFieldMappingProfile.save();

        // Step 13: Verify that both donors are displayed
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyDonorsInformationDisplayed([
          mappingProfile.donor[0].value,
          `"${secondDonor.value}"`,
        ]);
        FieldMappingProfileView.delete(mappingProfile.name);
      },
    );
  });
});
