import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';

describe('Order field mapping profile: Check asterisks for required fields when creating profile', () => {
  let user;
  const mappingProfile = {
    name: `Autotest Mapping Profile ${getRandomPostfix()}`,
    incomingRecordType: 'MARC Bibliographic',
    folioRecordType: FOLIO_RECORD_TYPE.ORDER,
  };

  before('Create test user', () => {
    cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });
  });

  after('Delete test user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it('C367951 Order field mapping profile: Check asterisks for required fields when creating profile (folijet)', () => {
    // Step 1: Go to "New field mapping profile" page
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.waitLoading();

    // Step 2: Populate the required fields with data
    NewFieldMappingProfile.addName(mappingProfile.name);
    NewFieldMappingProfile.addIncomingRecordType(mappingProfile.incomingRecordType);
    NewFieldMappingProfile.addFolioRecordType(mappingProfile.folioRecordType);

    // Step 3: Check that the specified fields have a red asterisk
    NewFieldMappingProfile.verifyFieldsMarkedWithAsterisks([
      { label: 'Purchase order status', conditions: { required: true } },
      { label: 'Vendor', conditions: { required: true } },
      { label: 'Order type', conditions: { required: true } },
      { label: 'Title', conditions: { required: true } },
      { label: 'Acquisition method', conditions: { required: true } },
      { label: 'Order format', conditions: { required: true } },
      { label: 'Receiving workflow', conditions: { required: true } },
      { label: 'Currency', conditions: { required: true } },
    ]);
  });
});
