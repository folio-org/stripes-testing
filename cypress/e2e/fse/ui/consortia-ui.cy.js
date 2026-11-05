import ConsortiumMgr from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import ConsortiumManagerApp from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Modals from '../../../support/fragments/modals';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import { APPLICATION_NAMES } from '../../../support/constants';

// opens the app from the app list, or from the apps dropdown when it's not shown in the list
const openApp = (appName) => {
  cy.get('body').then(($body) => {
    if ($body.find(`[data-test-app-list] a:contains("${appName}"):visible`).length) {
      TopMenuNavigation.navigateToApp(appName);
    } else {
      TopMenuNavigation.openAppFromDropdown(appName);
    }
  });
};

describe('fse-consortia - UI (no data manipulation)', {}, () => {
  let userTenants;
  let allTenants;
  let affiliationsCount;
  let currentUserId;
  let primaryTenant;
  let otherTenants;

  before(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    cy.allure().logCommandSteps();
    // consortium data is the same for all the tests, so it's requested only once
    cy.getAllTenants().then((tenants) => {
      allTenants = tenants;
    });
    cy.getUserAffiliationsCount().then((count) => {
      affiliationsCount = count;
    });
    cy.getUserTenants().then((tenants) => {
      userTenants = tenants;
      primaryTenant = tenants.filter((element) => element.isPrimary === true)[0];
      otherTenants = tenants.filter((element) => element.isPrimary === false);
      // the id of the logged-in user is taken from the affiliations, because the admin username can't be resolved to a single user on environments with anonymized data
      currentUserId = tenants[0].userId;
    });
  });

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.logoutViaApi();
    cy.clearCookies({ domain: null });
    cy.clearLocalStorage();
    cy.loginAsAdmin({
      path: SettingsMenu.consortiumManagerPath,
      waiter: ConsortiumMgr.waitLoading,
    });
    // authorize the API calls of the tests, without clearing cookies of the UI session
    cy.getAdminToken(false);
    cy.allure().logCommandSteps();
  });

  it(
    `TC195512 - switch active affiliation ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['consortia-sanity', 'fse', 'ui', 'TC195512'] },
    () => {
      if (affiliationsCount > 1) {
        ConsortiumMgr.checkCurrentTenantInTopMenu(primaryTenant.tenantName);
        // get any tenant from the list, but not the first one (central)
        const tenantNumber = Math.floor(Math.random() * (affiliationsCount - 1)) + 1;
        cy.wait(2000);
        // switch affiliation and verify that it was switched
        ConsortiumMgr.switchActiveAffiliation(
          primaryTenant.tenantName,
          userTenants[tenantNumber].tenantName,
        );
        cy.wait(2000);
        // switch back
        ConsortiumMgr.switchActiveAffiliation(
          userTenants[tenantNumber].tenantName,
          primaryTenant.tenantName,
        );
      } else {
        cy.log(
          `Can't switch affiliation since there's only one assigned to the user ${Cypress.env(
            'diku_login',
          )}`,
        );
      }
    },
  );

  it(
    `FDOPS-7318 - verify "Switch active affiliation" availability and cancel option ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['consortia-sanity', 'fse', 'ui', 'FDOPS-7318'] },
    () => {
      // the option is shown only when the user has more than one affiliation
      if (affiliationsCount > 1) {
        ConsortiumMgr.switchActiveAffiliationExists();
        const otherTenant = otherTenants[Math.floor(Math.random() * otherTenants.length)];
        ConsortiumMgr.checkCurrentTenantInTopMenu(primaryTenant.tenantName);
        // select another affiliation, but close the modal without saving
        ConsortiumMgr.openSelectAffiliationModal();
        ConsortiumMgr.selectAffiliationInModal(otherTenant.tenantName);
        ConsortiumMgr.clickCancelInSelectAffiliationModal();
        // active affiliation should stay unchanged
        ConsortiumMgr.checkCurrentTenantInTopMenu(primaryTenant.tenantName);
      } else {
        ConsortiumMgr.switchActiveAffiliationIsAbsent();
      }
    },
  );

  it(
    `FDOPS-7319 - verify "Membership" list matches consortium tenants ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['consortia-sanity', 'fse', 'ui', 'FDOPS-7319'] },
    () => {
      ConsortiumMgr.selectMembership();
      cy.wait(2000);
      cy.wrap(allTenants).each((tenant) => {
        ConsortiumMgr.verifyTenantInList(tenant.name, tenant.code);
      });
    },
  );

  it(
    `FDOPS-7320 - verify "Consortium manager" app is displayed ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['consortia-sanity', 'fse', 'ui', 'FDOPS-7320'] },
    () => {
      openApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
      ConsortiumManagerApp.waitLoading();
      ConsortiumManagerApp.verifySettingPaneIsDisplayed();
      // no arguments - settings within each section are checked to be sorted alphabetically
      ConsortiumManagerApp.verifyPaneIncludesSettings();
      ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();
      ConsortiumManagerApp.verifySelectMembersButton();
    },
  );

  it(
    `FDOPS-7321 - verify "Select members" modal in "Consortium manager" app ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['consortia-sanity', 'fse', 'ui', 'FDOPS-7321'] },
    () => {
      const tenantNames = userTenants.map((element) => element.tenantName);

      openApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
      ConsortiumManagerApp.waitLoading();
      ConsortiumManagerApp.clickSelectMembers();
      SelectMembers.waitLoading();
      SelectMembers.verifyInitialStatusOfSearchAndFilterPane();
      // all affiliations of the user are available for selection
      SelectMembers.verifyAvailableTenants(tenantNames);
      // search narrows the list down to the searched member
      SelectMembers.searchTenant(primaryTenant.tenantName);
      SelectMembers.verifyAvailableTenants([primaryTenant.tenantName]);
      SelectMembers.verifyResetAllButtonEnabled();
      // reset brings all the members back
      SelectMembers.clickResetAll();
      SelectMembers.verifyAvailableTenants(tenantNames);
      // close the modal without saving to keep the members selection unchanged
      SelectMembers.clickCancel();
      ConsortiumManagerApp.waitLoading();
    },
  );

  it(
    `FDOPS-7322 - verify affiliations of the user in "Users" app ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['consortia-sanity', 'fse', 'ui', 'FDOPS-7322'] },
    () => {
      openApp(APPLICATION_NAMES.USERS);
      Users.waitLoading();
      // close service point modal if it appears
      Modals.closeModalWithEscapeIfAny();
      UsersSearchPane.searchByKeywords(currentUserId);
      UsersSearchPane.openUser(currentUserId);
      UsersCard.verifyUserCardOpened();
      // the badge shows the number of affiliations of the user
      UsersCard.verifyAffiliationsQuantity(`${affiliationsCount}`);
      UsersCard.expandAffiliationsAccordion();
      // only the primary affiliation is verified, since the list can contain dozens of members
      UsersCard.verifyAffiliationsDetails(primaryTenant.tenantName, 1, primaryTenant.tenantName);
    },
  );
});

describe('fse-consortia - UI (data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: SettingsMenu.consortiumManagerPath,
      waiter: ConsortiumMgr.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195700 - Edit tenant name in "Consortium manager" settings ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['consortia', 'fse', 'ui', 'nonProd', 'TC195700'] },
    () => {
      cy.getUserTenants().then((userTenants) => {
        // get non-primary tenants
        const filteredTenants = userTenants.filter((element) => element.isPrimary === false);
        ConsortiumMgr.selectMembership();
        ConsortiumMgr.editTenant(`${filteredTenants[0].tenantName}`);
        // change tenant name
        ConsortiumMgr.editTenantName(
          `${filteredTenants[0].tenantName}`,
          `${filteredTenants[0].tenantName}_Edited`,
        );
        ConsortiumMgr.saveEditingTenantChangesClickActiveButton();
        ConsortiumMgr.checkEditedTenantName(`${filteredTenants[0].tenantName}_Edited`);

        // change name back to the original value
        ConsortiumMgr.editTenant(`${filteredTenants[0].tenantName}_Edited`);
        ConsortiumMgr.editTenantName(
          `${filteredTenants[0].tenantName}_Edited`,
          `${filteredTenants[0].tenantName}`,
        );
        ConsortiumMgr.saveEditingTenantChangesClickActiveButton();
        ConsortiumMgr.checkEditedTenantName(`${filteredTenants[0].tenantName}`);
      });
    },
  );
});
