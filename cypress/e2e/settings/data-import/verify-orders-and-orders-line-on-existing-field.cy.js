import {
  FOLIO_RECORD_TYPE,
  ORDER_STATUSES,
  VENDOR_NAMES,
  ACQUISITION_METHOD_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
} from '../../../support/constants';
import {
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  FieldMappingProfileView,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';

describe('data-import', () => {
  describe('Settings', () => {
    const testData = {};
    const mappingProfileC365634 = {
      name: `C365634testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.OPEN,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.OTHER,
      receivingWorkflow: 'Synchronized',
      currency: 'USD',
    };
    const sections = [
      'Order information',
      'Order line information',
      'Item details',
      'PO line details',
      'Vendor',
      'Cost details',
      'Fund distribution',
      'Location',
      'Physical resource details',
      'E-resources details',
    ];

    before('Create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfileC365634);
        NewFieldMappingProfile.save();
      });
    });

    after('Delete test data', () => {
      Users.deleteViaApi(testData.user.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileC365634.name);
    });

    it(
      'C365634 Orders field mapping profile: Verify Orders and Order Lines on existing field mapping profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.search(mappingProfileC365634.name);
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();

        FieldMappingProfiles.verifyActionMenu();

        FieldMappingProfileView.checkSummaryFieldsConditions([
          { label: 'Name', conditions: { value: mappingProfileC365634.name } },
          { label: 'Incoming record type', conditions: { value: 'MARC Bibliographic' } },
          { label: 'FOLIO record type', conditions: { value: 'Order' } },
        ]);

        FieldMappingProfileView.clickTagsAccordion();

        sections.forEach((section) => {
          FieldMappingProfileView.verifyAccordionByNameExpanded(section, true);
        });

        FieldMappingProfileView.collapseAll();
        FieldMappingProfileView.expandAll();

        FieldMappingProfileView.verifyLinkedActionProfile();
        FieldMappingProfileView.clickX();
      },
    );
  });
});
