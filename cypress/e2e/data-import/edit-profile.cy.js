import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import Helper from '../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import Users from '../../support/fragments/users/users';

let user;

describe('ui-data-import: edit profile', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
  });

  // after('delete test data', () => {
  //   Users.deleteViaApi(user.userId);
  // });

  it('C2351 Edit an existing field mapping profile (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    const mappingProfileName = `C11115 autotest mapping profile ${Helper.getRandomBarcode()}`;
    const mappingProfile = {
      name: mappingProfileName,
      typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance
    };

    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfile.name);

    
  });
});
