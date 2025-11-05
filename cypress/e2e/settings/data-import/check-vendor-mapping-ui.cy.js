import {
  ACQUISITION_METHOD_NAMES,
  FOLIO_RECORD_TYPE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileEdit from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileEditForm';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {};
    const mappingProfile = {
      name: `C376970 testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PE_MIX,
      receivingWorkflow: 'Synchronized',
      currency: 'USD',
      materialSupplier: 'Amazon.com',
      accessProvider: 'EBSCO',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };
    const sectionValues = [
      { sectionName: 'Vendor', value: 'GOBI Library Solutions', isRequired: true },
      { sectionName: 'Material supplier', value: 'Amazon.com', isRequired: false },
      { sectionName: 'Access provider', value: 'EBSCO', isRequired: false },
    ];

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C376970 Order field mapping profile: Check vendor mapping UI (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C376970'] },
      () => {
        // #1 Go to "Settings" application-> Select "Data import" setting-> Select "Field mapping profiles"-> Click on "Actions" button -> Select "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #2 Fill in the following fields:
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfile);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfile);

        // #3 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');
        FieldMappingProfileView.verifyMappingProfileOpened();

        // #4 View the organization details of the newly-created field mapping profile
        sectionValues.forEach(({ sectionName, value }) => {
          FieldMappingProfileView.verifyValueBySection(sectionName, value);
        });

        // #5 Click "Actions" button -> select "Edit" option
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfile.name);

        // #6 View the organization details of the newly-created field mapping profile in the Edit screen
        sectionValues.forEach(({ sectionName, value, isRequired }) => {
          FieldMappingProfileEdit.verifyValueBySection(sectionName, value, isRequired);
        });
      },
    );
  });
});
