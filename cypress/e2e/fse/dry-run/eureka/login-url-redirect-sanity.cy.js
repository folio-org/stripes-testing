import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Courses from '../../../../support/fragments/courses/courses';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Login', () => {
    const { user, memberTenant } = parseSanityParameters();

    it(
      'C451519 Original URL restored after logging in (eureka)',
      { tags: ['dryRun', 'eureka', 'C451519'] },
      () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();
        cy.logout();

        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();
        cy.logout();

        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.coursesPath,
          waiter: Courses.waitLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();
        cy.logout();

        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();
        cy.logout();

        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password);
        cy.allure().logCommandSteps();
      },
    );
  });
});
