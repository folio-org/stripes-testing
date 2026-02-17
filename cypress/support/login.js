import localforage from 'localforage';
import Tenant from './tenant';

import {
  Button,
  Dropdown,
  Heading,
  including,
  Link,
  Select,
  TextField,
  TextInput,
} from '../../interactors';

Cypress.Commands.add(
  'login',
  (
    username,
    password,
    {
      path = '/',
      waiter = () => cy.expect(Heading(including('Welcome')).exists()),
      authRefresh = false,
    } = {},
  ) => {
    function loginFn() {
      // We use a behind-the-scenes method of ensuring we are logged
      // out, rather than using the UI, in accordance with the Best
      // Practices guidance at
      // https://docs.cypress.io/guides/references/best-practices.html#Organizing-Tests-Logging-In-Controlling-State
      localforage.removeItem('okapiSess');

      if (Cypress.env('eureka')) {
        cy.logoutViaApi();
        cy.clearCookies({ domain: null }).then(() => {
          cy.visit(path);

          cy.selectTenantIfDropdown();

          cy.inputCredentialsAndLogin(username, password);
          waiter();
        });
      } else {
        cy.visit(path);

        // Todo: find the way to wrap interactor to cy chainable object
        cy.allure().logCommandSteps(false);
        cy.inputCredentialsAndLogin(username, password);
        cy.allure().logCommandSteps(true);
        // TODO: find the way how customize waiter timeout in case of interactors(cy.wrap may be)
        // https://stackoverflow.com/questions/57464806/set-timeout-for-cypress-expect-assertion
        // https://docs.cypress.io/api/commands/wrap#Requirements

        waiter();
        // There seems to be a race condition here: sometimes there is
        // re-render that happens so quickly that following actions like
        //       cy.get('#app-list-item-clickable-courses-module').click()
        // fail because the button becomes detached from the DOM after the
        // get() but before the click().
      }
    }

    if (authRefresh) {
      cy.waitForAuthRefresh(() => {
        loginFn();
      }, 20_000);
    } else loginFn();
  },
);

Cypress.Commands.add('logout', () => {
  cy.do([Dropdown({ id: 'profileDropdown' }).open(), Button('Log out').click()]);

  cy.expect(Button({ text: 'Log in again' }).exists());
});

Cypress.Commands.add('loginAsAdmin', (visitPath) => {
  cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'), visitPath);
  if (Cypress.env('eureka')) {
    // cy.getAdminToken();
  }
});

Cypress.Commands.add('loginAsCollegeAdmin', (visitPath) => {
  cy.login('ECS0001Admin', Cypress.env('diku_password'), visitPath);
  if (Cypress.env('eureka')) {
    // cy.getAdminToken();
  }
});

Cypress.Commands.add('loginAsUniversityAdmin', (visitPath) => {
  cy.login('ECS0005Admin', Cypress.env('diku_password'), visitPath);
  if (Cypress.env('eureka')) {
    // cy.getAdminToken();
  }
});

Cypress.Commands.add('loginAsConsortiumAdmin', (visitPath) => {
  cy.login('consortium_admin', Cypress.env('diku_password'), visitPath);
  if (Cypress.env('eureka')) {
    // cy.getAdminToken();
  }
});

Cypress.Commands.add(
  'checkSsoButton',
  (
    isEureka,
    visitPath = { path: '/', waiter: () => cy.expect(Heading(including('Welcome')).exists()) },
  ) => {
    // We use a behind-the-scenes method of ensuring we are logged
    // out, rather than using the UI, in accordance with the Best
    // Practices guidance at
    // https://docs.cypress.io/guides/references/best-practices.html#Organizing-Tests-Logging-In-Controlling-State
    localforage.removeItem('okapiSess');

    cy.visit(visitPath.path);

    if (!isEureka) {
      // Verify that SSO button displayed for okapi tenants
      cy.expect([Button('Log in via SSO').exists()]);
      // refresh page and check SSO again
      cy.reload(true);
      cy.expect([Button('Log in via SSO').exists()]);
    } else {
      // Verify that SSO button displayed for eureka tenants
      cy.get('img').then(() => {
        cy.wait(1000).then(() => {
          cy.get('body').then(($body) => {
            if ($body.find('select').length > 0) {
              cy.getAdminToken();
              cy.getConsortiaStatus().then((consortiaData) => {
                const targetTenantId = Tenant.get();
                cy.setTenant(consortiaData.centralTenantId);
                cy.getAllTenants().then((userTenants) => {
                  const targetTenant = userTenants.filter(
                    (element) => element.id === targetTenantId,
                  )[0];
                  cy.setTenant(targetTenantId);
                  cy.do(Select('Tenant/Library').choose(targetTenant.name));
                  cy.wait(500);
                  cy.do(Button('Continue').click());
                  cy.wait(1000);
                });
              });
            } else {
              cy.log('No tenant/library select found');
            }
          });
        });
      });
      // check the button
      cy.xpath("//a[contains(@id, 'saml') or contains(@id, 'sso')]").should('be.visible');
    }
  },
);

Cypress.Commands.add(
  'openLocateUiPage',
  (
    visitPath = {
      path: Cypress.env('LOCATE_HOST'),
      waiter: () => cy.expect(
        Heading(including('Choose a filter or enter a search query to show results.')).exists(),
      ),
    },
  ) => {
    cy.visit(visitPath.path);
  },
);

Cypress.Commands.add('selectTenantIfDropdown', () => {
  cy.get('img').then(() => {
    cy.wait(1000).then(() => {
      cy.get('body').then(($body) => {
        if ($body.find('select').length > 0) {
          const targetTenantId = Tenant.get();
          cy.resetTenant();
          cy.getAdminToken();
          cy.getConsortiaStatus().then((consortiaData) => {
            cy.setTenant(consortiaData.centralTenantId);
            cy.getAllTenants().then((userTenants) => {
              const targetTenant = userTenants.filter(
                (element) => element.id === targetTenantId,
              )[0];
              cy.setTenant(targetTenantId);
              cy.selectTenantAndContinue(targetTenant.name);
            });
          });
        } else {
          cy.log('No tenant/library select found');
        }
      });
    });
  });
});

Cypress.Commands.add('verifyDefaultTenantSelectionPage', () => {
  cy.expect([
    Select('Tenant/Library').exists(),
    Select('Tenant/Library').has({ checkedOptionText: 'Select your tenant/library' }),
    Button('Continue').has({ disabled: true }),
  ]);
});

Cypress.Commands.add('selectTenantAndContinue', (tenantName) => {
  cy.do(Select('Tenant/Library').choose(tenantName));
  cy.wait(500);
  cy.do(Button('Continue').click());
  cy.wait(1000);
});

Cypress.Commands.add('verifyDefaultEurekaLoginPage', () => {
  cy.expect([
    TextInput('Username').exists(),
    TextInput('Password').exists(),
    Button({ name: 'login' }).exists(),
  ]);
  if (Cypress.env('ecsEnabled')) {
    cy.expect(Link('Return to tenant/library selection screen').exists());
  }
});

Cypress.Commands.add('inputCredentialsAndLogin', (username, password) => {
  if (Cypress.env('eureka')) {
    cy.do([
      TextInput('Username').fillIn(username, { log: false }),
      TextInput('Password').fillIn(password, { log: false }),
      Button({ name: 'login' }).click(),
    ]);
  } else {
    cy.do([
      TextField('Username').fillIn(username, { log: false }),
      TextField('Password').fillIn(password, { log: false }),
      Button('Log in').click(),
    ]);
  }
});
