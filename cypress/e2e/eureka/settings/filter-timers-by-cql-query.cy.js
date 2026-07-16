import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { TIMER_TYPES } from '../../../support/constants/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      systemModuleName: null,
      systemModuleId: null,
      userTimerId: null,
    };
    let testUser;

    before('Create user and set up timer data', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((props) => {
        testUser = props;
        cy.assignCapabilitiesToExistingUser(testUser.userId, [], [CapabilitySets.schedulerManage]);
      });
      cy.then(() => {
        cy.getTimers({ limit: 100 }).then(({ body }) => {
          const systemTimers = body.timerDescriptors.filter(
            (t) => t.type === TIMER_TYPES.SYSTEM.toLowerCase(),
          );
          const baseTimer = systemTimers.find((t) => t.moduleName && t.moduleId) || systemTimers[0];
          testData.systemModuleName = baseTimer.moduleName;
          testData.systemModuleId = baseTimer.moduleId;

          cy.createTimerApi({
            routingEntry: {
              methods: ['GET'],
              pathPattern: `/users?query=username=AT_C1415769_${randomPostfix}`,
              unit: 'minute',
              delay: '30',
            },
            moduleName: testData.systemModuleName,
            enabled: true,
          }).then(({ body: timerBody }) => {
            testData.userTimerId = timerBody.id;
          });
        });
      });
      cy.then(() => {
        cy.getToken(testUser.username, testUser.password);
      });
    });

    after('Delete user and timer', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      cy.deleteTimerApi(testData.userTimerId);
    });

    it(
      'C1415769 Filter timers by moduleName, moduleId, and type via CQL query (eureka)',
      { tags: ['extendedPath', 'eureka', 'C1415769'] },
      () => {
        // Step 1: Filter by moduleName → only matching timers returned
        cy.getTimers({ query: `moduleName=${testData.systemModuleName}`, limit: 100 }).then(
          ({ body, status }) => {
            expect(status).to.equal(200);
            expect(body.totalRecords).to.be.greaterThan(0);
            body.timerDescriptors.forEach((timer) => {
              expect(timer.moduleName).to.equal(testData.systemModuleName);
            });
          },
        );

        // Step 2: Filter by moduleId → only matching timers returned
        cy.getTimers({ query: `moduleId=${testData.systemModuleId}`, limit: 100 }).then(
          ({ body, status }) => {
            expect(status).to.equal(200);
            expect(body.totalRecords).to.be.greaterThan(0);
            body.timerDescriptors.forEach((timer) => {
              expect(timer.moduleId).to.equal(testData.systemModuleId);
            });
          },
        );

        // Step 3: Filter by type=USER → only user-type timers returned
        cy.getTimers({ query: `type=${TIMER_TYPES.USER}`, limit: 100 }).then(({ body, status }) => {
          expect(status).to.equal(200);
          expect(body.totalRecords).to.be.greaterThan(0);
          body.timerDescriptors.forEach((timer) => {
            expect(timer.type).to.equal(TIMER_TYPES.USER.toLowerCase());
          });
        });

        // Step 4: Filter by type=SYSTEM → only system-type timers returned
        cy.getTimers({ query: `type=${TIMER_TYPES.SYSTEM}`, limit: 100 }).then(
          ({ body, status }) => {
            expect(status).to.equal(200);
            expect(body.totalRecords).to.be.greaterThan(0);
            body.timerDescriptors.forEach((timer) => {
              expect(timer.type).to.equal(TIMER_TYPES.SYSTEM.toLowerCase());
            });
          },
        );

        // Step 5: Filter by type=system (lowercase) → 0 results (case-sensitive)
        cy.getTimers({ query: `type=${TIMER_TYPES.SYSTEM.toLowerCase()}`, limit: 100 }).then(
          ({ body, status }) => {
            expect(status).to.equal(200);
            expect(body.totalRecords).to.equal(0);
          },
        );

        // Step 6: Filter by non-existing moduleId → 0 results
        cy.getTimers({
          query: `moduleId=at_c1415769_nonexistent_${randomPostfix}`,
          limit: 100,
        }).then(({ body, status }) => {
          expect(status).to.equal(200);
          expect(body.totalRecords).to.equal(0);
        });

        // Step 7: moduleName AND type=USER → only timers matching both conditions
        cy.getTimers({
          query: `moduleName=${testData.systemModuleName} and type=${TIMER_TYPES.USER}`,
          limit: 100,
        }).then(({ body, status }) => {
          expect(status).to.equal(200);
          expect(body.totalRecords).to.be.greaterThan(0);
          body.timerDescriptors.forEach((timer) => {
            expect(timer.type).to.equal(TIMER_TYPES.USER.toLowerCase());
            expect(timer.moduleName).to.equal(testData.systemModuleName);
          });
        });

        // Step 8: moduleId AND type=SYSTEM → only timers matching both conditions
        cy.getTimers({
          query: `moduleId=${testData.systemModuleId} and type=${TIMER_TYPES.SYSTEM}`,
          limit: 100,
        }).then(({ body, status }) => {
          expect(status).to.equal(200);
          expect(body.totalRecords).to.be.greaterThan(0);
          body.timerDescriptors.forEach((timer) => {
            expect(timer.type).to.equal(TIMER_TYPES.SYSTEM.toLowerCase());
            expect(timer.moduleId).to.equal(testData.systemModuleId);
          });
        });

        // Step 9: moduleId OR type=USER → timers matching at least one condition
        cy.getTimers({
          query: `moduleId=${testData.systemModuleId} or type=${TIMER_TYPES.USER}`,
          limit: 100,
        }).then(({ body, status }) => {
          expect(status).to.equal(200);
          expect(body.totalRecords).to.be.at.least(2);
          body.timerDescriptors.forEach((timer) => {
            expect(
              timer.moduleId === testData.systemModuleId ||
                timer.type === TIMER_TYPES.USER.toLowerCase(),
            ).to.eq(true);
          });
        });

        // Step 10: Two separate query params → 400 error
        const q1 = encodeURIComponent(`moduleName=${testData.systemModuleName}`);
        const q2 = encodeURIComponent(`type=${TIMER_TYPES.SYSTEM}`);
        cy.okapiRequest({
          path: `scheduler/timers?query=${q1}&query=${q2}`,
          searchParams: {},
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
        }).then(({ body, status }) => {
          expect(status).to.equal(400);
          expect(JSON.stringify(body)).to.include('Could not resolve attribute');
        });
      },
    );
  });
});
