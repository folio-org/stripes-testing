import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C369052 Info icon Location ${getRandomStringCode(50)}`,
      incomingRecordType: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
    };

    beforeEach('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    afterEach('Delete test user', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C380720 Order field mapping: review adjusted info icon to the "Acquisitions units" field in the Create page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380720'] },
      () => {
        const message =
          'Order creation will error unless the importing user is a member of the specified acquisitions unit';

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.addFolioRecordType('Order');
        NewFieldMappingProfile.verifyAcquisitionsUnitsInfoMessage(message);
      },
    );

    it(
      'C380722 Invoice field mapping: review adjusted info icon to the "Acquisitions units" field in the Create page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380722'] },
      () => {
        const message =
          'Invoice creation will error unless the importing user is a member of the specified acquisitions unit';

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.addFolioRecordType('Invoice');
        NewFieldMappingProfile.verifyAcquisitionsUnitsInfoMessage(message);
      },
    );

    it(
      'C369052 Field mapping profile: Check info icons when creating field mapping profile for holdings (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C369052'] },
      () => {
        const message = 'Required when creating Holdings';

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.verifyPermanentFieldInfoMessage(message);
      },
    );
  });
});
