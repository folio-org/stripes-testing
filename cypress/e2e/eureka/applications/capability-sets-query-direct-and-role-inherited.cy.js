import { v4 as uuidv4 } from 'uuid';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Applications', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleR1Name: `AT_C1464309_Role_R1_${randomPostfix}`,
      roleR2Name: `AT_C1464309_Role_R2_${randomPostfix}`,
      s1: { name: null, id: null },
      s2: { name: null, id: null },
      s3: { name: null, id: null },
      s4: { name: null, id: null },
      userA: null,
      userB: null,
      userC: null,
      userD: null,
      userE: null,
      roleR1Id: null,
      roleR2Id: null,
      randomUuid: uuidv4(),
    };

    function createUser(index, keycloak = true) {
      return Users.createViaApi(
        {
          type: 'staff',
          active: true,
          username: `at_c1464309_user${index.toLowerCase()}_${randomPostfix}`,
          personal: {
            lastName: `AT_C1464309_User${index}_${randomPostfix}`,
            email: 'AT_C1464309@test.com',
            preferredContactTypeIds: ['002'],
          },
        },
        { keycloak },
      );
    }

    before('Create capability sets, roles and users', () => {
      cy.getAdminToken();

      cy.getCapabilitySetsApi(4).then((sets) => {
        testData.s1.name = sets[0].name;
        testData.s1.id = sets[0].id;
        testData.s2.name = sets[1].name;
        testData.s2.id = sets[1].id;
        testData.s3.name = sets[2].name;
        testData.s3.id = sets[2].id;
        testData.s4.name = sets[3].name;
        testData.s4.id = sets[3].id;

        // R1: S2+S3; R2: S3+S4
        cy.createAuthorizationRoleApi(testData.roleR1Name).then((r1) => {
          testData.roleR1Id = r1.id;
          cy.addCapabilitySetsToNewRoleApi(testData.roleR1Id, [testData.s2.id, testData.s3.id]);
        });
        cy.createAuthorizationRoleApi(testData.roleR2Name).then((r2) => {
          testData.roleR2Id = r2.id;
          cy.addCapabilitySetsToNewRoleApi(testData.roleR2Id, [testData.s3.id, testData.s4.id]);
        });
      });

      // User A: R1 + direct S1
      createUser('A').then((u) => {
        testData.userA = u;
        cy.addRolesToNewUserApi(u.id, [testData.roleR1Id]);
        cy.addCapabilitySetsToNewUserApi(u.id, [testData.s1.id]);
      });

      // User B: R1 + direct S3 (S3 deduplicated)
      createUser('B').then((u) => {
        testData.userB = u;
        cy.addRolesToNewUserApi(u.id, [testData.roleR1Id]);
        cy.addCapabilitySetsToNewUserApi(u.id, [testData.s3.id]);
      });

      // User C: R1 + R2 (S3 inherited from both)
      createUser('C').then((u) => {
        testData.userC = u;
        cy.addRolesToNewUserApi(u.id, [testData.roleR1Id, testData.roleR2Id]);
      });

      // User D: Keycloak record, no roles, no direct sets
      createUser('D').then((u) => {
        testData.userD = u;
      });

      // User E: no Keycloak record
      createUser('E', false).then((u) => {
        testData.userE = u;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      [testData.userA, testData.userB, testData.userC, testData.userD, testData.userE].forEach(
        (u) => {
          if (u) Users.deleteViaApi(u.id);
        },
      );
      cy.deleteAuthorizationRoleApi(testData.roleR1Id);
      cy.deleteAuthorizationRoleApi(testData.roleR2Id);
    });

    it(
      'C1464309 Capability sets query returns direct and role-inherited sets for requested users (eureka)',
      { tags: ['criticalPath', 'eureka', 'C1464309'] },
      () => {
        const allSetNames = [
          testData.s1.name,
          testData.s2.name,
          testData.s3.name,
          testData.s4.name,
        ];
        const userIdsOrdered = [
          testData.userA.id,
          testData.userB.id,
          testData.userC.id,
          testData.userD.id,
          testData.userE.id,
          testData.randomUuid,
        ];

        // Steps 1-2: query all 6 user IDs with all 4 set names in whitelist
        cy.queryCapabilitySetsForUsersApi(userIdsOrdered, { capabilitySetNames: allSetNames }).then(
          ({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.userCapabilitySets).to.have.lengthOf(6);
            // verify response order matches request order
            body.userCapabilitySets.forEach((entry, i) => {
              expect(entry.userId).to.eq(userIdsOrdered[i]);
            });
            // User A: S1 (direct) + S2+S3 (via R1)
            const a = body.userCapabilitySets.find((e) => e.userId === testData.userA.id);
            expect(a.capabilitySetNames).to.have.members([
              testData.s1.name,
              testData.s2.name,
              testData.s3.name,
            ]);
            // User B: S2+S3 via R1; S3 deduplicated
            const b = body.userCapabilitySets.find((e) => e.userId === testData.userB.id);
            expect(b.capabilitySetNames).to.have.members([testData.s2.name, testData.s3.name]);
            expect(b.capabilitySetNames.filter((n) => n === testData.s3.name)).to.have.lengthOf(1);
            // User C: S2+S3 via R1, S3+S4 via R2; S3 deduplicated
            const c = body.userCapabilitySets.find((e) => e.userId === testData.userC.id);
            expect(c.capabilitySetNames).to.have.members([
              testData.s2.name,
              testData.s3.name,
              testData.s4.name,
            ]);
            expect(c.capabilitySetNames.filter((n) => n === testData.s3.name)).to.have.lengthOf(1);
            // User D, E, random UUID: empty
            [testData.userD.id, testData.userE.id, testData.randomUuid].forEach((uid) => {
              const entry = body.userCapabilitySets.find((e) => e.userId === uid);
              expect(entry.capabilitySetNames).to.have.lengthOf(0);
            });
            // names sorted alphabetically per entry
            [a, b, c].forEach((entry) => {
              const sorted = [...entry.capabilitySetNames].sort();
              expect(entry.capabilitySetNames).to.deep.eq(sorted);
            });
          },
        );

        // Step 3: reverse order — same results, different order in response
        const reversedIds = [...userIdsOrdered].reverse();
        cy.queryCapabilitySetsForUsersApi(reversedIds, { capabilitySetNames: allSetNames }).then(
          ({ status, body }) => {
            expect(status).to.eq(200);
            body.userCapabilitySets.forEach((entry, i) => {
              expect(entry.userId).to.eq(reversedIds[i]);
            });
            const a = body.userCapabilitySets.find((e) => e.userId === testData.userA.id);
            expect(a.capabilitySetNames).to.have.members([
              testData.s1.name,
              testData.s2.name,
              testData.s3.name,
            ]);
          },
        );

        // Step 4: filter to S1 only — User A returns just S1
        cy.queryCapabilitySetsForUsersApi([testData.userA.id], {
          capabilitySetNames: [testData.s1.name],
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          expect(body.userCapabilitySets[0].capabilitySetNames).to.have.members([testData.s1.name]);
        });

        // Step 5: non-existent capability set name → empty result
        cy.queryCapabilitySetsForUsersApi([testData.userA.id], {
          capabilitySetNames: ['non_existing_capability_set.view'],
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          expect(body.userCapabilitySets[0].capabilitySetNames).to.have.lengthOf(0);
        });

        // Step 6: duplicate user ID → deduplicated in response (2 elements: A once, D once)
        cy.queryCapabilitySetsForUsersApi(
          [testData.userA.id, testData.userA.id, testData.userD.id],
          { capabilitySetNames: allSetNames },
        ).then(({ status, body }) => {
          expect(status).to.eq(200);
          expect(body.userCapabilitySets).to.have.lengthOf(2);
          const userIds = body.userCapabilitySets.map((e) => e.userId);
          expect(userIds).to.include(testData.userA.id);
          expect(userIds).to.include(testData.userD.id);
        });

        // Step 7: no capabilitySetNames filter → all assigned sets returned
        cy.queryCapabilitySetsForUsersApi([testData.userA.id]).then(({ status, body }) => {
          expect(status).to.eq(200);
          const entry = body.userCapabilitySets[0];
          expect(entry.capabilitySetNames).to.have.members([
            testData.s1.name,
            testData.s2.name,
            testData.s3.name,
          ]);
          // response contains only userCapabilitySets array with userId and capabilitySetNames
          expect(Object.keys(body)).to.deep.eq(['userCapabilitySets']);
          Object.keys(entry).forEach((key) => {
            expect(['userId', 'capabilitySetNames']).to.include(key);
          });
        });

        // Step 8: unassign R1 from User A via API
        cy.updateRolesForUserApi(testData.userA.id, []);

        // Step 9: S2 and S3 no longer returned after R1 unassignment
        cy.queryCapabilitySetsForUsersApi([testData.userA.id]).then(({ status, body }) => {
          expect(status).to.eq(200);
          expect(body.userCapabilitySets[0].capabilitySetNames).to.have.members([testData.s1.name]);
        });

        // Step 10: re-assign R1 via API; verify S2+S3 returned again
        cy.addRolesToNewUserApi(testData.userA.id, [testData.roleR1Id]);
        cy.queryCapabilitySetsForUsersApi([testData.userA.id]).then(({ status, body }) => {
          expect(status).to.eq(200);
          expect(body.userCapabilitySets[0].capabilitySetNames).to.have.members([
            testData.s1.name,
            testData.s2.name,
            testData.s3.name,
          ]);
        });
      },
    );
  });
});
