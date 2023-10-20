import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const incomingRecordType = 'MARC Bibliographic';

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete user', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C9322 Create match profile for MARC Bib matching to a MARC record type (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const matchProfile = {
          profileName: `C9322 autotest match profile_${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '999',
            in1: 'f',
            in2: 'f',
            subfield: 's',
          },
          existingRecordFields: {
            field: '999',
            in1: 'f',
            in2: 'f',
            subfield: 's',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
        };

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.openNewMatchProfileForm();
        NewMatchProfile.fillName(matchProfile.profileName);
        NewMatchProfile.verifyExistingRecordSection();
        NewMatchProfile.selectExistingRecordType(matchProfile.existingRecordType);
        NewMatchProfile.verifyExistingRecordTypeIsSelected(matchProfile.existingRecordType);
        NewMatchProfile.fillIncomingRecordSections(matchProfile);
        NewMatchProfile.fillExistingRecordSections(matchProfile);
        ['MARC Holdings', 'Order', 'Invoice'].forEach((option) => {
          NewMatchProfile.verifyMatchCriterion(option);
        });
        NewMatchProfile.saveAndClose();
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileWithIncomingAndExistingValue(
          matchProfile,
          incomingRecordType,
        );

        MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      },
    );

    it(
      'C9321 Create match profile for MARC Bib matching to a FOLIO record type (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const matchProfile = {
          profileName: `C368009 001 to Instance HRID ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.instanceHrid,
        };

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.openNewMatchProfileForm();
        NewMatchProfile.fillName(matchProfile.profileName);
        NewMatchProfile.verifyExistingRecordSection();
        NewMatchProfile.selectExistingRecordType(matchProfile.existingRecordType);
        NewMatchProfile.verifyExistingRecordTypeIsSelected(matchProfile.existingRecordType);
        NewMatchProfile.verifyIncomingRecordsDropdown();
        NewMatchProfile.fillIncomingRecordSections(matchProfile);
        NewMatchProfile.selectExistingRecordField(matchProfile.instanceOption);
        NewMatchProfile.saveAndClose();
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileWithFolioRecordValue(matchProfile, incomingRecordType);

        MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      },
    );
  });
});
