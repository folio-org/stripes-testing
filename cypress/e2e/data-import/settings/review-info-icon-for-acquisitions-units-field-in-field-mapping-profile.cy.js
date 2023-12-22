import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
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
      'C380720 Order field mapping: review adjusted info icon to the "Acquisitions units" field in the Create page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const message =
          'Order creation will error unless the importing user is a member of the specified acquisitions unit';

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.addFolioRecordType('Order');
        NewFieldMappingProfile.verifyAcquisitionsUnitsInfoMessage(message);
      },
    );
  });
});
