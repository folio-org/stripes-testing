import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import SoftwareVersions, {
  SETTINGS_SUBSECTION_ABOUT,
} from '../../../support/fragments/settings/softwareVersions/software-versions';

describe('Eureka', () => {
  describe('Login', () => {
    const appIds = [];
    const moduleIds = [];
    const uiModuleIds = [];
    const expectedMissingModules = [];
    const isDefaultEnv =
      Cypress.env('OKAPI_HOST').includes('snapshot') ||
      Cypress.env('OKAPI_HOST').includes('cypress');
    let tempUser;

    const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

    before('Create user, get data', () => {
      cy.getAdminToken();
      cy.getApplicationsForTenantApi(Cypress.env('OKAPI_TENANT'), false).then(({ body }) => {
        body.applicationDescriptors.forEach((app) => {
          appIds.push(app.id);
          moduleIds.push(...app.modules.map((module) => module.id));
          uiModuleIds.push(...app.uiModules.map((module) => module.id));
        });
      });
      cy.createTempUser([]).then((createdUserProperties) => {
        tempUser = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(tempUser.userId, capabsToAssign, []);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(tempUser.userId);
    });

    it(
      'C431150 Details for all available applications shown in "Settings" / "Software versions" (eureka)',
      { tags: ['smoke', 'eureka', 'shiftLeft', 'C431150'] },
      () => {
        cy.login(tempUser.username, tempUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_ABOUT);
        SoftwareVersions.waitLoading();
        if (isDefaultEnv) SoftwareVersions.checkErrorText(expectedMissingModules);
        appIds.forEach((appId) => {
          SoftwareVersions.verifyTextPresent(appId);
        });
        moduleIds.forEach((moduleId) => {
          SoftwareVersions.verifyTextPresent(moduleId);
        });
        uiModuleIds.forEach((uiModuleId) => {
          SoftwareVersions.verifyTextPresent(uiModuleId);
        });
      },
    );
  });
});
