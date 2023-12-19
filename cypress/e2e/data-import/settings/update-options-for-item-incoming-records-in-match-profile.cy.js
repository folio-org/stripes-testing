import { Permissions } from '../../../support/dictionary';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Settings', () => {
    let user;

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C411857 Match profile: update options for Item "Incoming records" (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.openNewMatchProfileForm();
        NewMatchProfile.selectExistingRecordType('ITEM');
        NewMatchProfile.verifyIncomingRecordsDropdown();
        NewMatchProfile.verifyAbsenceInIncomingRecordsDropdown('MARC Authority');
      },
    );
  });
});
