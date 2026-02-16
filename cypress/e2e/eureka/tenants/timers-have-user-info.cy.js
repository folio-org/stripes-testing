import moment from 'moment';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Users from '../../../support/fragments/users/users';

describe('Eureka', () => {
  describe('Tenants', () => {
    const capabSetsToAssign = [CapabilitySets.schedulerManage];
    const timerBody = {
      routingEntry: {
        methods: ['GET'],
        pathPattern: '/users?query=username=TIMERTEST',
        unit: 'minute',
        delay: '30',
      },
      moduleName: 'mod-users',
      enabled: true,
    };
    const updatedTimerBody = { ...timerBody };
    updatedTimerBody.routingEntry.delay = '15';
    let userA;
    let userB;
    let timerId;
    let dateCreated;

    before('Create users', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((createdUserProperties) => {
        userA = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(userA.userId, [], capabSetsToAssign);
      });
      cy.createTempUser([]).then((createdUserProperties) => {
        userB = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(userB.userId, [], capabSetsToAssign);
      });
    });

    after('Delete users, timer', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
      cy.deleteTimerApi(timerId);
    });

    it(
      'C451622 [MODSCHED-62] Timers have info about date and user that created and updated them (eureka)',
      { tags: ['criticalPath', 'eureka', 'C451622'] },
      () => {
        cy.then(() => {
          cy.getToken(userA.username, userA.password);
          cy.createTimerApi(timerBody).then(({ body, status }) => {
            timerId = body.id;
            dateCreated = body.metadata.createdDate;

            expect(status).to.equal(201);
            expect(body.routingEntry.delay).to.equal(timerBody.routingEntry.delay);
            expect(body.routingEntry.pathPattern).to.equal(timerBody.routingEntry.pathPattern);

            expect(moment(body.metadata.createdDate, moment.ISO_8601, true).isValid()).to.eq(true);
            expect(body.metadata.createdByUserId).to.equal(userA.userId);
            expect(moment(body.metadata.updatedDate, moment.ISO_8601, true).isValid()).to.eq(true);
            expect(body.metadata.updatedByUserId).to.equal(userA.userId);
            expect(body.metadata.createdDate).to.equal(body.metadata.updatedDate);
          });
        }).then(() => {
          cy.getToken(userB.username, userB.password);
          cy.updateTimerApi(timerId, { ...updatedTimerBody, id: timerId }).then(
            ({ body, status }) => {
              expect(status).to.equal(200);
              expect(body.routingEntry.delay).to.equal(updatedTimerBody.routingEntry.delay);
              expect(body.routingEntry.pathPattern).to.equal(
                updatedTimerBody.routingEntry.pathPattern,
              );

              expect(moment(body.metadata.createdDate, moment.ISO_8601, true).isValid()).to.eq(
                true,
              );
              expect(body.metadata.createdByUserId).to.equal(userA.userId);
              expect(moment(body.metadata.updatedDate, moment.ISO_8601, true).isValid()).to.eq(
                true,
              );
              expect(body.metadata.updatedByUserId).to.equal(userB.userId);
              expect(body.metadata.createdDate).to.equal(dateCreated);
              expect(body.metadata.updatedDate).to.not.equal(dateCreated);
            },
          );
        });
      },
    );
  });
});
