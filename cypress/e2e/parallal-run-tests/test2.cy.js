/* eslint-disable no-console */
/* eslint-disable no-unused-expressions */
import { getRandomDelay } from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import { Button, Dropdown } from '../../../interactors';

describe('Parallel tests group 2', () => {
  before('Before test group 2', () => {
    cy.log('Executing before test group 2');
    console.log('Executing before test group 2');
  });

  after('After test group 2', () => {
    cy.log('Finished after test group 2');
    console.log('Finished after test group 2');
  });

  beforeEach('Before each test in group 2', () => {
    cy.log('Executing before each test in group 2');
    console.log('Executing before each test in group 2');
  });

  afterEach('After each test in group 2', () => {
    cy.log('Finished after each test in group 2');
    console.log('Finished after each test in group 2');
  });

  it('C11121 Test1', { tags: ['allTests', 'testSmoke', 'C11121', 'passingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.bulkEditPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11122 Test2 testSmoke', { tags: ['allTests', 'testSmoke', 'C11122', 'failingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(false).to.be.true;
      });
    });

  it('C11123 Test3 testSmoke nonParallel', { tags: ['allTests', 'testSmoke', 'C11123', 'passingTest', 'nonParallel'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11124 Test4 testSmoke nonParallel', { tags: ['allTests', 'testSmoke', 'C11124', 'failingTest', 'nonParallel'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.requestsPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(false).to.be.true;
      });
    });

  it('C11125 Test5 testCritical', { tags: ['allTests', 'testCritical', 'C11125', 'passingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.checkInPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11126 Test6 testCritical', { tags: ['allTests', 'testCritical', 'C11126', 'failingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.agreementsPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(false).to.be.true;
      });
    });

  it('C11127 Test5 testCritical nonParallel', { tags: ['allTests', 'testCritical', 'C11127', 'passingTest', 'nonParallel'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11128 Test6 testCritical nonParallel', { tags: ['allTests', 'testCritical', 'C11128', 'failingTest', 'nonParallel'] },
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
