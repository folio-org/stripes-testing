import { matching } from '../../../../interactors';
import { EXISTING_RECORD_NAMES } from '../../../support/constants';
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
      const profileName = `AT_C1538647_MatchProfile_${randomPostfix}`;
      const matchFields = { field: '035', in1: '*', in2: '*', subfield: 'a' };
      const qualifierType = 'Begins with';
      const validValue1 = `AT_C1538647_Valid1_${randomPostfix}`;
      const validValue2 = `AT_C1538647_Valid2_${randomPostfix}`;
      const validValue3 = `AT_C1538647_Valid3_${randomPostfix}`;
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
        'C1538647 User cannot save new match profile with MARC bib to MARC bib match when "Use a qualifier" value is blank or whitespace-only (promin)',
        { tags: ['criticalPath', 'promin', 'C1538647'] },
        () => {
          // Step 1: Click "Actions" - "New"
          MatchProfiles.clickCreateNewMatchProfile();

          // Step 2: Fill the form - Incoming qualifier value left blank, Existing qualifier
          // value filled with a valid value
          NewMatchProfile.fillName(profileName);
          NewMatchProfile.selectExistingRecordType(EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC);
          NewMatchProfile.fillIncomingRecordSections({ incomingRecordFields: matchFields });
          NewMatchProfile.fillExistingRecordSections({ existingRecordFields: matchFields });
          NewMatchProfile.fillQualifierInIncomingPart(qualifierType, '');
          NewMatchProfile.fillQualifierInExistingPart(qualifierType, validValue1);
          NewMatchProfile.saveAndClose();
          // Expected: error under Incoming qualifier value, no error under Existing
          NewMatchProfile.verifyQualifierValueErrorInIncomingPart(true);
          NewMatchProfile.verifyQualifierValueErrorInExistingPart(false);

          // Step 3: Incoming qualifier value set to whitespace-only
          NewMatchProfile.fillQualifierValueInIncomingPart(whitespaceOnlyValue);
          NewMatchProfile.saveAndClose();
          // Expected: error remains under Incoming
          NewMatchProfile.verifyQualifierValueErrorInIncomingPart(true);

          // Step 4: Clear Existing qualifier value too
          NewMatchProfile.fillQualifierValueInExistingPart('');
          NewMatchProfile.saveAndClose();
          // Expected: error under both Incoming and Existing
          NewMatchProfile.verifyQualifierValueErrorInIncomingPart(true);
          NewMatchProfile.verifyQualifierValueErrorInExistingPart(true);

          // Step 5: Fill a valid value in Incoming qualifier value
          NewMatchProfile.fillQualifierValueInIncomingPart(validValue2);
          NewMatchProfile.saveAndClose();
          // Expected: error under Existing only
          NewMatchProfile.verifyQualifierValueErrorInIncomingPart(false);
          NewMatchProfile.verifyQualifierValueErrorInExistingPart(true);

          // Step 6: Existing qualifier value set to whitespace-only
          NewMatchProfile.fillQualifierValueInExistingPart(whitespaceOnlyValue);
          NewMatchProfile.saveAndClose();
          // Expected: error remains under Existing
          NewMatchProfile.verifyQualifierValueErrorInExistingPart(true);

          // Step 7: Clear both qualifier values; uncheck "Use a qualifier" in Incoming section
          NewMatchProfile.fillQualifierValueInIncomingPart('');
          NewMatchProfile.fillQualifierValueInExistingPart('');
          NewMatchProfile.uncheckQualifierInIncomingPart();
          NewMatchProfile.saveAndClose();
          // Expected: error remains under Existing (Incoming is no longer validated - its
          // qualifier is disabled)
          NewMatchProfile.verifyQualifierValueErrorInExistingPart(true);

          // Step 8: Fill a valid value in Existing qualifier value
          NewMatchProfile.fillQualifierValueInExistingPart(validValue3);
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
