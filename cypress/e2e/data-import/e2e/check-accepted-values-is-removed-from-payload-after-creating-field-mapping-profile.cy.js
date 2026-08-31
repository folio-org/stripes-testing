import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES, FOLIO_RECORD_TYPE } from '../../../support/constants';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import {
  FieldMappingProfiles,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let user = null;

    const mappingProfile = {
      name: `C594468 Test order field mapping profile${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      natureOfContent: 'bibliography',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.intercept('POST', 'data-import-profiles/mappingProfiles').as('createMappingProfile');
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C594468 Check that acceptedValues is removed from payload after creating field mapping profile (promin)',
      { tags: ['extendedPath', 'promin', 'C594468'] },
      () => {
        // Step 1: Open "New field mapping profile" page
        FieldMappingProfiles.openNewMappingProfileForm();

        // Step 2-3: Populate fields and save
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addNatureOfContentTerms(mappingProfile.natureOfContent);
        NewFieldMappingProfile.save();

        // Step 4-5: Verify that acceptedValues is removed from payload
        cy.wait('@createMappingProfile', getLongDelay()).then(({ request }) => {
          const requestBody = request.body;
          const natureOfContentTerms = requestBody.profile.mappingDetails.mappingFields[22];
          expect(natureOfContentTerms).to.not.have.property('acceptedValues');
        });
        FieldMappingProfileView.delete(mappingProfile.name);
      },
    );
  });
});
