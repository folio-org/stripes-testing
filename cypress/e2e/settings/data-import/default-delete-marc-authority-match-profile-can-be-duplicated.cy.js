import { matching } from '../../../../interactors';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import Notifications from '../../../support/fragments/settings/dataImport/notifications';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import { COMMON_BUTTON_LABELS } from '../../../support/constants/constants';

describe('Data Import', () => {
  describe('Settings', () => {
    describe('MARC authority', () => {
      const originalProfileName = 'Default - Delete MARC Authority records';
      const randomPostfix = getRandomPostfix();
      const duplicatedProfileName = `AT_C1453727_MatchProfile_${randomPostfix}`;
      const testData = {};
      const capabSetsToAssign = [CapabilitySets.uiDataImportSettingsManage];

      before('Create user and login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.login(testData.user.username, testData.user.password, {
            path: SettingsMenu.matchProfilePath,
            waiter: MatchProfiles.waitLoading,
          });
          MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        });
      });

      after('Delete created match profile and user', () => {
        cy.getAdminToken();
        MatchProfiles.deleteMatchProfileByNameViaApi(duplicatedProfileName);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1453727 "Default - Delete MARC Authority records" match profile can be successfully duplicated (promin)',
        { tags: ['criticalPath', 'promin', 'C1453727'] },
        () => {
          // Step 1: Open "Default - Delete MARC Authority records" match profile
          MatchProfiles.search(originalProfileName);
          MatchProfiles.selectMatchProfileFromList(originalProfileName);
          MatchProfileView.verifyMatchProfileOpened();

          // Step 2: Duplicate via Actions menu
          MatchProfileView.duplicate();

          // Step 3: Update the Name field with a unique value
          NewMatchProfile.fillName(duplicatedProfileName);

          // Step 4: Save; verify callout, original still in list, new profile in list
          NewMatchProfile.saveAndClose();
          InteractorsTools.checkCalloutMessage(
            matching(new RegExp(Notifications.matchProfileCreateSuccessfully)),
          );
          MatchProfileView.verifyMatchProfileTitleName(duplicatedProfileName);
          MatchProfiles.search(originalProfileName);
          MatchProfiles.verifySearchResult(originalProfileName);
          MatchProfiles.search(duplicatedProfileName);
          MatchProfiles.verifySearchResult(duplicatedProfileName);

          // Step 5: Open duplicated profile; verify Edit, Duplicate, Delete are all enabled
          MatchProfiles.selectMatchProfileFromList(duplicatedProfileName);
          MatchProfileView.verifyActionsMenuOptionsDisabled(
            [
              COMMON_BUTTON_LABELS.EDIT,
              COMMON_BUTTON_LABELS.DUPLICATE,
              COMMON_BUTTON_LABELS.DELETE,
            ],
            { isDisabled: false },
          );
        },
      );
    });
  });
});
