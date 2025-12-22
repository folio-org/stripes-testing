/* eslint-disable no-console */
/* eslint-disable no-unused-expressions */
import { getRandomDelay } from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import { Button, Dropdown } from '../../../interactors';

describe('Parallel tests group 3', () => {
  before('Before test group 3', () => {
    cy.log('Executing before test group 3');
    console.log('Executing before test group 3');
  });

  after('After test group 3', () => {
    cy.log('Finished after test group 3');
    console.log('Finished after test group 3');
  });

  beforeEach('Before each test in group 3', () => {
    cy.log('Executing before each test in group 3');
    console.log('Executing before each test in group 3');
  });

  afterEach('After each test in group 3', () => {
    cy.log('Finished after each test in group 3');
    console.log('Finished after each test in group 3');
  });

  it('C11131 Test1', { tags: ['allTests', 'testSmoke', 'C11131', 'passingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.bulkEditPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11132 Test2 testSmoke', { tags: ['allTests', 'testSmoke', 'C11132', 'failingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(false).to.be.true;
      });
    });

  it('C11133 Test3 testSmoke nonParallel', { tags: ['allTests', 'testSmoke', 'C11133', 'passingTest', 'nonParallel'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11134 Test4 testSmoke nonParallel', { tags: ['allTests', 'testSmoke', 'C11134', 'failingTest', 'nonParallel'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.requestsPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(false).to.be.true;
      });
    });

  it('C11135 Test5 testCritical', { tags: ['allTests', 'testCritical', 'C11135', 'passingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.checkInPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11136 Test6 testCritical', { tags: ['allTests', 'testCritical', 'C11136', 'failingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.agreementsPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(false).to.be.true;
      });
    });

  it('C11137 Test5 testCritical nonParallel', { tags: ['allTests', 'testCritical', 'C11137', 'passingTest', 'nonParallel'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11138 Test6 testCritical nonParallel', { tags: ['allTests', 'testCritical', 'C11138', 'failingTest', 'nonParallel'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.checkOutPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(false).to.be.true;
      });
    });
});
