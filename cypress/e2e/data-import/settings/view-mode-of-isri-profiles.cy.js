import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/z39.50TargetProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';

// job profile names for checking sorting
const abcJobProfile = `abc jobProfile.${getRandomPostfix()}`;
const adcJobProfile = `adc jobProfile.${getRandomPostfix()}`;
const zbcJobProfile = `zbc jobProfile.${getRandomPostfix()}`;
const zdcJobProfile = `zdc jobProfile.${getRandomPostfix()}`;

describe('ui-data-import', () => {
  let user;
  const profileName = `C374176 autotest profile${getRandomPostfix()}`;
  let profileId;

  before('login', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui,
      permissions.uiInventorySettingsConfigureSingleRecordImport.gui
    ])
      .then(userProperties => {
        user = userProperties;

        Z3950TargetProfiles.createNewZ3950TargetProfileViaApi(profileName).then(initialId => { profileId = initialId; });
        cy.login(user.username, user.password);
      });
  });

  it('C374176 Verify the view mode of ISRI profiles (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      cy.visit(SettingsMenu.targetProfilesPath);
      Z3950TargetProfiles.verifyTargetProfileFormOpened();
      Z3950TargetProfiles.openTargetProfile(profileId);
      // Z3950TargetProfiles.openOclcWorldCat();
      Z3950TargetProfiles.verifyTargetProfileForm();
      // step 3

      Z3950TargetProfiles.verifyCreateInstanceJobProfileList(profileName);
      Z3950TargetProfiles.verifyUpdateInstanceJobProfileList(profileName);
    //   Z3950TargetProfiles.verifyHotlinksToDefaultCreateInstanceJobProfile(profileName);
    //   Z3950TargetProfiles.verifyHotlinksToDefaultUpdateInstanceJobProfile(profileName);
    });
});
