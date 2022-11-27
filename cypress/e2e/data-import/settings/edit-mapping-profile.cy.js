import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import: Edit an existing field mapping profile', () => {
  const mappingProfileName = `C11115 autotest mapping profile ${Helper.getRandomBarcode()}`;
  let user;
  const mappingProfile = {
    name: mappingProfileName,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance
  };
  const instanceStatusTerm = '"Batch Loaded"';

  before('create test data', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });

        // create field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        FieldMappingProfiles.saveProfile();
        InteractorsTools.closeCalloutMessage();
        FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfileName);
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
  });

  it('C2351 Edit an existing field mapping profile (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    FieldMappingProfiles.searchMappingProfile(mappingProfileName);
    FieldMappingProfileView.editMappingProfile();
    FieldMappingProfileEdit.verifyScreenName(mappingProfileName);
    FieldMappingProfileEdit.fillInstanceStatusTerm(instanceStatusTerm);
    FieldMappingProfileEdit.save();
    FieldMappingProfileView.checkCalloutMessage(mappingProfileName);
    FieldMappingProfileView.verifyInstanceStatusTerm(instanceStatusTerm);
  });
});
