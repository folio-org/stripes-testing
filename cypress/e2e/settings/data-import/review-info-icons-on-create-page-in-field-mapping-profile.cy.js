import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C369052 Info icon Location ${getRandomStringCode(50)}`,
      incomingRecordType: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
    };

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

    it(
      'C380722 Invoice field mapping: review adjusted info icon to the "Acquisitions units" field in the Create page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const message =
          'Invoice creation will error unless the importing user is a member of the specified acquisitions unit';

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.addFolioRecordType('Invoice');
        NewFieldMappingProfile.verifyAcquisitionsUnitsInfoMessage(message);
      },
    );

    it(
      'C369052 Field mapping profile: Check info icons when creating field mapping profile for holdings (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const message = 'Required when creating Holdings';

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.verifyPermanentFieldInfoMessage(message);
      },
    );
  });
});
