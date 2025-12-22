/* eslint-disable no-console */
/* eslint-disable no-unused-expressions */
import { getRandomDelay } from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import { Button, Dropdown } from '../../../interactors';

describe('Parallel tests group 1', () => {
  before('Before test group 1', () => {
    cy.log('Executing before test group 1');
    console.log('Executing before test group 1');
  });

  after('After test group 1', () => {
    cy.log('Finished after test group 1');
    console.log('Finished after test group 1');
  });

  beforeEach('Before each test in group 1', () => {
    cy.log('Executing before each test in group 1');
    console.log('Executing before each test in group 1');
  });

  afterEach('After each test in group 1', () => {
    cy.log('Finished after each test in group 1');
    console.log('Finished after each test in group 1');
  });

  it('C11111 Test1', { tags: ['allTests', 'testSmoke', 'C11111', 'passingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.bulkEditPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11112 Test2 testSmoke', { tags: ['allTests', 'testSmoke', 'C11112', 'failingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(false).to.be.true;
      });
    });

  it('C11113 Test3 testSmoke nonParallel', { tags: ['allTests', 'testSmoke', 'C11113', 'passingTest', 'nonParallel'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11114 Test4 testSmoke nonParallel', { tags: ['allTests', 'testSmoke', 'C11114', 'failingTest', 'nonParallel'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.requestsPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(false).to.be.true;
      });
    });

  it('C11115 Test5 testCritical', { tags: ['allTests', 'testCritical', 'C11115', 'passingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.checkInPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11116 Test6 testCritical', { tags: ['allTests', 'testCritical', 'C11116', 'failingTest'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.agreementsPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(false).to.be.true;
      });
    });

  it('C11117 Test5 testCritical nonParallel', { tags: ['allTests', 'testCritical', 'C11117', 'passingTest', 'nonParallel'] },
    () => {
      cy.wrap(true).then(() => {
        // cy.wait(getRandomDelay(1));
        cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: () => cy.wait(10000) });
        cy.do((Dropdown({ id: 'profileDropdown' }).open()));
      }).then(() => {
        cy.expect(true).to.be.true;
      });
    });

  it('C11118 Test6 testCritical nonParallel', { tags: ['allTests', 'testCritical', 'C11118', 'failingTest', 'nonParallel'] },
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
