import Affiliations from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Applications', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      // R1: Central role with S1 and S2
      roleR1Name: `AT_C1464312_Role_R1_${randomPostfix}`,
      // R2: Member role with S2 and S3
      roleR2Name: `AT_C1464312_Role_R2_${randomPostfix}`,
    };

    // S1, S2 in Central; S2, S3 in Member; S4 direct Member only
    const setNames = {
      s1: null,
      s2: null,
      s3: null,
      s4: null,
      s1Id: null,
      s2IdCentral: null,
      s2IdMember: null,
      s3Id: null,
      s4Id: null,
    };

    before('Create roles, user and assign capability sets', () => {
      cy.getAdminToken();

      // Fetch four capability sets from Central to use as S1..S4
      cy.resetTenant();
      cy.getCapabilitySetsApi(4).then((sets) => {
        setNames.s1 = sets[0].name;
        setNames.s2 = sets[1].name;
        setNames.s3 = sets[2].name;
        setNames.s4 = sets[3].name;
        setNames.s1Id = sets[0].id;
        setNames.s2IdCentral = sets[1].id;

        // Create R1 in Central with S1 and S2
        cy.createAuthorizationRoleApi(testData.roleR1Name).then((r1) => {
          testData.roleR1Id = r1.id;
          cy.addCapabilitySetsToNewRoleApi(testData.roleR1Id, [
            setNames.s1Id,
            setNames.s2IdCentral,
          ]);
        });
      });

      // Fetch matching capability sets from Member for S2, S3, S4
      cy.setTenant(Affiliations.College);
      cy.getCapabilitySetsApi(4).then((sets) => {
        setNames.s2IdMember = sets.find((s) => s.name === setNames.s2)?.id ?? sets[1].id;
        setNames.s3Id = sets.find((s) => s.name === setNames.s3)?.id ?? sets[2].id;
        setNames.s4Id = sets.find((s) => s.name === setNames.s4)?.id ?? sets[3].id;

        // Create R2 in Member with S2 and S3
        cy.createAuthorizationRoleApi(testData.roleR2Name).then((r2) => {
          testData.roleR2Id = r2.id;
          cy.addCapabilitySetsToNewRoleApi(testData.roleR2Id, [setNames.s2IdMember, setNames.s3Id]);
        });
      });

      // Create User A in Central tenant; assign College affiliation
      cy.resetTenant();
      cy.createTempUser([]).then((userProperties) => {
        testData.userA = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.userA.userId);

        // In Central: assign role R1 and directly assign S2
        cy.addRolesToNewUserApi(testData.userA.userId, [testData.roleR1Id]);
        cy.addCapabilitySetsToNewUserApi(testData.userA.userId, [setNames.s2IdCentral]);

        // In Member: assign role R2 and directly assign S3 and S4
        cy.setTenant(Affiliations.College);
        cy.addRolesToNewUserApi(testData.userA.userId, [testData.roleR2Id]);
        cy.addCapabilitySetsToNewUserApi(testData.userA.userId, [setNames.s3Id, setNames.s4Id]);
        cy.resetTenant();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      cy.resetTenant();
      Users.deleteViaApi(testData.userA.userId);
      cy.deleteAuthorizationRoleApi(testData.roleR1Id);
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationRoleApi(testData.roleR2Id);
      cy.resetTenant();
    });

    it(
      'C1464312 Capability sets query returns non-overlapping tenant-specific assignments for a user created in the Central tenant (eureka)',
      { tags: ['extendedPathECS', 'eureka', 'C1464312'] },
      () => {
        // Step 1: query from Central — expect S1 and S2 only (S2 deduplicated)
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          tenantId: Affiliations.Consortia,
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          const names = body.userCapabilitySets[0].capabilitySetNames;
          expect(names).to.have.members([setNames.s1, setNames.s2]);
          // S2 deduplicated — appears exactly once
          expect(names.filter((n) => n === setNames.s2)).to.have.lengthOf(1);
        });

        // Step 2: query from Member — expect S2, S3, S4 (S3 deduplicated; S1 absent)
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          tenantId: Affiliations.College,
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          const names = body.userCapabilitySets[0].capabilitySetNames;
          expect(names).to.have.members([setNames.s2, setNames.s3, setNames.s4]);
          // S2 and S3 each deduplicated despite two assignment paths
          expect(names.filter((n) => n === setNames.s2)).to.have.lengthOf(1);
          expect(names.filter((n) => n === setNames.s3)).to.have.lengthOf(1);
        });

        // Step 3: whitelist all 4 sets, query from Central — still returns only S1+S2
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          tenantId: Affiliations.Consortia,
          capabilitySetNames: [setNames.s1, setNames.s2, setNames.s3, setNames.s4],
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          const names = body.userCapabilitySets[0].capabilitySetNames;
          expect(names).to.have.members([setNames.s1, setNames.s2]);
        });

        // Step 4: whitelist all 4 sets, query from Member — returns S2+S3+S4; S1 does not leak
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          tenantId: Affiliations.College,
          capabilitySetNames: [setNames.s1, setNames.s2, setNames.s3, setNames.s4],
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          const names = body.userCapabilitySets[0].capabilitySetNames;
          expect(names).to.have.members([setNames.s2, setNames.s3, setNames.s4]);
        });
      },
    );
  });
});
