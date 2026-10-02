import { matching } from '../../../../interactors';
import {
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  MATCH_PROFILE_STATIC_VALUE_TYPES,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import Notifications from '../../../support/fragments/settings/dataImport/notifications';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    describe('Match profile', () => {
      const randomPostfix = getRandomPostfix();
      const profileName = `AT_C1554388_MatchProfile_${randomPostfix}`;
      const incomingStaticValue = `AT_C1554388_Static_${randomPostfix}`;
      const qualifierType = 'Begins with';
      const validValue = `AT_C1554388_Valid_${randomPostfix}`;
      const whitespaceOnlyValue = '   ';
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
        cy.getAdminToken(false);
        MatchProfiles.deleteMatchProfileByNameViaApi(profileName);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1554388 User cannot save new match profile ("Static value (submatch only)" to "Instance") when "Use a qualifier" value is blank or whitespace-only (promin)',
        { tags: ['criticalPath', 'promin', 'C1554388'] },
        () => {
          // Step 1: Click "Actions" - "New" in the Match profiles list
          MatchProfiles.clickCreateNewMatchProfile();

          // Step 2: Fill the form - Incoming = Static value (submatch only), Existing = Instance.
          // Existing qualifier value left blank
          NewMatchProfile.fillName(profileName);
          NewMatchProfile.selectExistingRecordType(EXISTING_RECORD_NAMES.INSTANCE);
          NewMatchProfile.fillStaticValue(
            incomingStaticValue,
            MATCH_PROFILE_STATIC_VALUE_TYPES.TEXT,
          );
          NewMatchProfile.selectExistingRecordField(NewMatchProfile.optionsList.instanceHrid);
          NewMatchProfile.fillQualifierInExistingPart(
            qualifierType,
            '',
            FOLIO_RECORD_TYPE.INSTANCE,
          );
          NewMatchProfile.saveAndClose();
          // Expected: error under Existing qualifier value
          NewMatchProfile.verifyQualifierValueErrorInExistingPart(true);

          // Step 3: Existing qualifier value set to whitespace-only
          NewMatchProfile.fillQualifierValueInExistingPart(whitespaceOnlyValue);
          NewMatchProfile.saveAndClose();
          // Expected: save still blocked, error remains under Existing
          NewMatchProfile.verifyQualifierValueErrorInExistingPart(true);

          // Step 4: Fill a valid value in Existing qualifier value
          NewMatchProfile.fillQualifierValueInExistingPart(validValue);
          NewMatchProfile.saveAndClose();
          // Expected: profile saves successfully
          InteractorsTools.checkCalloutMessage(
            matching(new RegExp(Notifications.matchProfileCreateSuccessfully)),
          );
          MatchProfileView.verifyMatchProfileTitleName(profileName);
        },
      );
    });
  });
});
