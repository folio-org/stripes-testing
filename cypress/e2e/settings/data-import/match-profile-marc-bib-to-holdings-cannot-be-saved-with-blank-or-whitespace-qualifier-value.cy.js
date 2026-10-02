import { matching } from '../../../../interactors';
import { EXISTING_RECORD_NAMES, FOLIO_RECORD_TYPE } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
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
      const profileName = `AT_C1554385_MatchProfile_${randomPostfix}`;
      const incomingRecordFields = { field: '035', in1: '*', in2: '*', subfield: 'a' };
      const qualifierType = 'Begins with';
      const validValue1 = `AT_C1554385_Valid1_${randomPostfix}`;
      const validValue2 = `AT_C1554385_Valid2_${randomPostfix}`;
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
        'C1554385 User cannot save new match profile ("MARC Bibliographic" to "Holdings") when "Use a qualifier" value is blank or whitespace-only (promin)',
        { tags: ['criticalPath', 'promin', 'C1554385'] },
        () => {
          // Step 1: Click "Actions" - "New"
          MatchProfiles.clickCreateNewMatchProfile();

          // Step 2: Fill the form - Incoming = MARC Bibliographic (default), Existing = Holdings.
          // Incoming qualifier value left blank, Existing qualifier value filled with a valid
          // value
          NewMatchProfile.fillName(profileName);
          NewMatchProfile.selectExistingRecordType(EXISTING_RECORD_NAMES.HOLDINGS);
          NewMatchProfile.fillIncomingRecordSections({ incomingRecordFields });
          NewMatchProfile.selectExistingRecordField(NewMatchProfile.optionsList.holdingsHrid);
          NewMatchProfile.fillQualifierInIncomingPart(qualifierType, '');
          NewMatchProfile.fillQualifierInExistingPart(
            qualifierType,
            validValue1,
            FOLIO_RECORD_TYPE.HOLDINGS,
          );
          NewMatchProfile.saveAndClose();
          // Expected: error under Incoming qualifier value, no error under Existing
          NewMatchProfile.verifyQualifierValueErrorInIncomingPart(true);
          NewMatchProfile.verifyQualifierValueErrorInExistingPart(false);

          // Step 3: Incoming qualifier value set to whitespace-only
          NewMatchProfile.fillQualifierValueInIncomingPart(whitespaceOnlyValue);
          NewMatchProfile.saveAndClose();
          // Expected: save still blocked, error remains under Incoming
          NewMatchProfile.verifyQualifierValueErrorInIncomingPart(true);

          // Step 4: Clear Existing qualifier value too
          NewMatchProfile.fillQualifierValueInExistingPart('');
          NewMatchProfile.saveAndClose();
          // Expected: save blocked, error under both Incoming and Existing
          NewMatchProfile.verifyQualifierValueErrorInIncomingPart(true);
          NewMatchProfile.verifyQualifierValueErrorInExistingPart(true);

          // Step 5: Uncheck "Use a qualifier" in the Incoming record section
          NewMatchProfile.uncheckQualifierInIncomingPart();
          NewMatchProfile.saveAndClose();
          // Expected: save still blocked; Incoming error gone, Existing error remains
          NewMatchProfile.verifyQualifierValueErrorInExistingPart(true);

          // Step 6: Fill a valid value in Existing qualifier value
          NewMatchProfile.fillQualifierValueInExistingPart(validValue2);
          NewMatchProfile.saveAndClose();
          // Expected: profile saves successfully
          InteractorsTools.checkCalloutMessage(
            matching(new RegExp(Notifications.matchProfileCreateSuccessfully)),
          );
          MatchProfiles.search(profileName);
          MatchProfiles.verifySearchResult(profileName);
        },
      );
    });
  });
});
