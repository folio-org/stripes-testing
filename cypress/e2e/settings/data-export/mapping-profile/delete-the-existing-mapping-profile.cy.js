import { EXPORT_TRANSFORMATION_NAMES } from '../../../../support/constants';
import permissions from '../../../../support/dictionary/permissions';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create user and go to page', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C15828 Delete the existing mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C15828'] },
      () => {
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();

        const testProfile = {
          name: `autoTestMappingProf.${getRandomPostfix()}`,
          holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
          holdingsMarcField: '901',
          subfieldForHoldings: 'a',
          itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
          itemMarcField: '902',
          subfieldForItem: 'a',
        };
        ExportFieldMappingProfiles.createMappingProfile(testProfile);
        ExportFieldMappingProfiles.deleteMappingProfile(testProfile.name);
      },
    );
  });
});
