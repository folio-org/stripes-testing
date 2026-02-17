import ConsortiumMgr from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('fse-consortia - UI (no data manipulation)', () => {
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
    `TC195511 - verify that consortium manager is displayed correctly for ${Cypress.env(
      'OKAPI_HOST',
    )}`,
    { tags: ['consortia-sanity', 'fse', 'ui'] },
    () => {
      cy.getAdminToken().then(() => {
        cy.getUserTenants().then((userTenants) => {
          // get primary tenant
          const filteredTenants = userTenants.filter((element) => element.isPrimary === true);
          cy.reload();
          cy.wait(3000);
          ConsortiumMgr.checkCurrentTenantInTopMenu(filteredTenants[0].tenantName);
        });
        cy.getUserAffiliationsCount().then((count) => {
          if (count > 1) {
            ConsortiumMgr.switchActiveAffiliationExists();
          } else {
            ConsortiumMgr.switchActiveAffiliationIsAbsent();
          }
        });
      });
    },
  );

  it(
    `TC195512 - switch active affiliation ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['consortia-sanity', 'fse', 'ui'] },
    () => {
      cy.getAdminToken().then(() => {
        cy.getUserAffiliationsCount().then((count) => {
          cy.getUserTenants().then((userTenants) => {
            if (count > 1) {
              const primaryTenant = userTenants.filter((element) => element.isPrimary === true)[0];
              // get any tenant from the list, but not the first one (central)
              const tenantNumber = Math.floor(Math.random() * (count - 1)) + 1;
              cy.wait(2000);
              // switch affiliation and verify that it was switched
              ConsortiumMgr.switchActiveAffiliation(
                primaryTenant.tenantName,
                userTenants[tenantNumber].tenantName,
              );
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
          });
        });
      });
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
    `TC195700 - Edit tenant name in "Consortium manager" settings ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['consortia', 'fse', 'ui', 'nonProd'] },
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
