import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import { EXPORT_TRANSFORMATION_NAMES } from '../../../support/constants';

let user;

describe('setting: data-export', () => {
  before('create user and go to page', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });
  });

  after('selete user', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C15828 Delete the existing mapping profile (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
      ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();

      const testProfile = {
        name: `autoTestMappingProf.${getRandomPostfix()}`,
        holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
        holdingsMarcField: '901',
        subfieldForHoldings: '$a',
        itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
        itemMarcField: '902',
        subfieldForItem: '$a',
      };
      ExportFieldMappingProfiles.createMappingProfile(testProfile);
      ExportFieldMappingProfiles.deleteMappingProfile(testProfile.name);
    },
  );
});
