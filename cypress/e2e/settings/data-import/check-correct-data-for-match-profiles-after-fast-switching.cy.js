import { APPLICATION_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileEdit from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileEditForm';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const postfix = getRandomPostfix();
    const matchProfile1 = {
      profileName: `C423596 Incorrect data match 1 ${postfix}`,
      incomingRecordFields: { field: '035', in1: '', in2: '', subfield: 'a' },
      existingRecordFields: { field: '035', in1: '', in2: '', subfield: 'z' },
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const matchProfile2 = {
      profileName: `C423596 Incorrect data match 2 ${postfix}`,
      incomingRecordFields: { field: '035', in1: '', in2: '', subfield: 'a' },
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.identifierOCLC,
    };
    const incomingRecordType = 'MARC Bibliographic';

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(user.userId);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile1.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile2.profileName);
      });
    });

    it(
      'C423596 Check the correct data for matching profiles after fast switching (promin)',
      { tags: ['edgeCases', 'promin', 'C423596'] },
      () => {
        // Step 2: create "Incorrect data match 1" - MARC Bibliographic -> MARC Bibliographic,
        // incoming 035 $a exactly matches existing 035 $z
        MatchProfiles.clickCreateNewMatchProfile();
        NewMatchProfile.fillName(matchProfile1.profileName);
        NewMatchProfile.selectExistingRecordType(matchProfile1.existingRecordType);
        NewMatchProfile.verifyExistingRecordTypeIsSelected(matchProfile1.existingRecordType);
        NewMatchProfile.fillIncomingRecordSections(matchProfile1);
        NewMatchProfile.fillExistingRecordSections(matchProfile1);
        NewMatchProfile.saveAndClose();
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileWithIncomingAndExistingValue(
          matchProfile1,
          incomingRecordType,
        );

        // Step 3: create "Incorrect data match 2" - MARC Bibliographic -> Instance, incoming
        // 035 $a exactly matches existing Instance Identifier: OCLC
        MatchProfiles.clickCreateNewMatchProfile();
        NewMatchProfile.fillName(matchProfile2.profileName);
        NewMatchProfile.selectExistingRecordType(matchProfile2.existingRecordType);
        NewMatchProfile.verifyExistingRecordTypeIsSelected(matchProfile2.existingRecordType);
        NewMatchProfile.fillIncomingRecordSections(matchProfile2);
        NewMatchProfile.selectExistingRecordField(matchProfile2.instanceOption);
        NewMatchProfile.saveAndClose();
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileWithFolioRecordValue(matchProfile2, incomingRecordType);

        // Step 4-5: edit "Incorrect data match 1" - change the incoming 035 subfield from $a to
        // $z and save
        MatchProfiles.search(matchProfile1.profileName);
        MatchProfiles.selectMatchProfileFromList(matchProfile1.profileName);
        MatchProfileView.edit();
        MatchProfileEdit.verifyScreenName(matchProfile1.profileName);
        MatchProfileEdit.changeIncomingRecordSubfieldValue('z');
        MatchProfileEdit.clickSaveAndCloseButton({ profileCreated: false, profileUpdated: true });

        // Step 6: edit "Incorrect data match 2" right after - its own incoming 035 $a data must
        // show up unchanged, not the "z" just entered while editing match profile 1
        MatchProfiles.search(matchProfile2.profileName);
        MatchProfiles.selectMatchProfileFromList(matchProfile2.profileName);
        MatchProfileView.edit();
        MatchProfileEdit.verifyScreenName(matchProfile2.profileName);
        MatchProfileEdit.verifyIncomingRecordFieldValues(matchProfile2.incomingRecordFields);
      },
    );
  });
});
