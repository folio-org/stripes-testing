import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  const mappingProfile = {
    name: `C2351 autotest mapping profile ${getRandomPostfix}`,
    typeValue: FOLIO_RECORD_TYPE.INSTANCE
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
        FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfile.name);
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfile.name);
  });

  it('C2351 Edit an existing field mapping profile (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    FieldMappingProfiles.search(mappingProfile.name);
    FieldMappingProfileView.editMappingProfile();
    FieldMappingProfileEdit.verifyScreenName(mappingProfile.name);
    FieldMappingProfileEdit.fillInstanceStatusTerm(instanceStatusTerm);
    FieldMappingProfileEdit.save();
    FieldMappingProfileView.checkCalloutMessage(mappingProfile.name);
    FieldMappingProfileView.verifyInstanceStatusTerm(instanceStatusTerm);
  });
});
