import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import getRandomPostfix from '../../../support/utils/stringTools';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      name: `C367952 mapping profile ${getRandomPostfix()}`,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };
    before('create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C367952 Orders field mapping profile: Verify the profile cannot be saved without required fields (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.checkNewMatchProfileFormIsOpened();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfile);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkNewMatchProfileFormIsOpened();
        NewFieldMappingProfile.isPurchaseOrderStatusFieldFocused(true);
      },
    );
  });
});
