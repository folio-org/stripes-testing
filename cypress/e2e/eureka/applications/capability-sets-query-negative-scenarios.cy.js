import { v4 as uuidv4 } from 'uuid';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Applications', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleR1Name: `AT_C1464310_Role_R1_${randomPostfix}`,
      s1: { name: null, id: null },
      s2: { name: null, id: null },
      userA: null,
      roleR1Id: null,
    };

    before('Create role, user A and assign capability sets', () => {
      cy.getAdminToken();

      cy.getCapabilitySetsApi(2).then((sets) => {
        testData.s1.name = sets[0].name;
        testData.s1.id = sets[0].id;
        testData.s2.name = sets[1].name;
        testData.s2.id = sets[1].id;

        cy.createAuthorizationRoleApi(testData.roleR1Name).then((r1) => {
          testData.roleR1Id = r1.id;
          cy.addCapabilitySetsToNewRoleApi(testData.roleR1Id, [testData.s2.id]);
        });
      });

      Users.createViaApi(
        {
          type: 'staff',
          active: true,
          username: `at_c1464310_usera_${randomPostfix}`,
          personal: {
            lastName: `AT_C1464310_UserA_${randomPostfix}`,
            email: 'AT_C1464310@test.com',
            preferredContactTypeIds: ['002'],
          },
        },
        { keycloak: true },
      ).then((user) => {
        testData.userA = { userId: user.id };
        cy.addRolesToNewUserApi(testData.userA.userId, [testData.roleR1Id]);
        cy.addCapabilitySetsToNewUserApi(testData.userA.userId, [testData.s1.id]);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userA.userId);
      cy.deleteAuthorizationRoleApi(testData.roleR1Id);
    });

    it(
      'C1464310 Capability sets query negative scenarios (eureka)',
      { tags: ['extendedPath', 'eureka', 'C1464310'] },
      () => {
        // Step 1: empty body → 400
        cy.okapiRequest({
          method: 'POST',
          path: 'users/capability-sets/query',
          body: {},
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
        }).then(({ status }) => {
          expect(status).to.eq(400);
        });

        // Step 2: empty userIds array → 400
        cy.queryCapabilitySetsForUsersApi([], {}).then(({ status }) => {
          expect(status).to.eq(400);
        });

        // Step 3: null inside userIds → 400 with validation_error on userIds field
        cy.queryCapabilitySetsForUsersApi([null], {}).then(({ status, body }) => {
          expect(status).to.eq(400);
          expect(body.errors[0].code).to.eq('validation_error');
          expect(body.errors[0].parameters[0].key).to.eq('userIds');
        });

        // Step 4: non-UUID string in userIds → 400
        cy.queryCapabilitySetsForUsersApi(['not-a-uuid'], {}).then(({ status }) => {
          expect(status).to.eq(400);
        });

        // Step 5: null inside capabilitySetNames → 400 with validation_error on capabilitySetNames
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          capabilitySetNames: [null],
        }).then(({ status, body }) => {
          expect(status).to.eq(400);
          expect(body.errors[0].code).to.eq('validation_error');
          expect(body.errors[0].parameters[0].key).to.eq('capabilitySetNames');
        });

        // Step 6: S1 name in uppercase → whitelist mismatch, empty result for User A
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          capabilitySetNames: [testData.s1.name.toUpperCase()],
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          expect(body.userCapabilitySets[0].capabilitySetNames).to.have.lengthOf(0);
        });

        // Step 7: S1 name without the action suffix (e.g. "ui-users" instead of "ui-users.create")
        const s1WithoutSuffix = testData.s1.name.includes('.')
          ? testData.s1.name.substring(0, testData.s1.name.lastIndexOf('.'))
          : testData.s1.name;
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          capabilitySetNames: [s1WithoutSuffix],
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          expect(body.userCapabilitySets[0].capabilitySetNames).to.have.lengthOf(0);
        });

        // Step 8: 500 UUIDs (User A + 499 random); only User A should have S1
        const randomUuids = Array.from({ length: 499 }, () => uuidv4());
        const uuids500 = [testData.userA.userId, ...randomUuids];
        cy.queryCapabilitySetsForUsersApi(uuids500, {
          capabilitySetNames: [testData.s1.name],
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          expect(body.userCapabilitySets).to.have.lengthOf(500);
          const userAEntry = body.userCapabilitySets.find(
            (e) => e.userId === testData.userA.userId,
          );
          expect(userAEntry.capabilitySetNames).to.have.members([testData.s1.name]);
          body.userCapabilitySets
            .filter((e) => e.userId !== testData.userA.userId)
            .forEach((e) => {
              expect(e.capabilitySetNames).to.have.lengthOf(0);
            });
        });

        // Step 9: 501 UUIDs → 400 with size limit message
        const uuids501 = [...uuids500, uuidv4()];
        cy.queryCapabilitySetsForUsersApi(uuids501, {
          capabilitySetNames: [testData.s1.name],
        }).then(({ status, body }) => {
          expect(status).to.eq(400);
          expect(JSON.stringify(body)).to.include('size must be between 1 and 500');
        });
      },
    );
  });
});
