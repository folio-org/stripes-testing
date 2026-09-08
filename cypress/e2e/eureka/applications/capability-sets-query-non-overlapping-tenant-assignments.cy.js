import Affiliations from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Applications', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      // R1: Member role with S1 and S2
      roleR1Name: `AT_C1464313_Role_R1_${randomPostfix}`,
      // R2: Central role with S2 and S3
      roleR2Name: `AT_C1464313_Role_R2_${randomPostfix}`,
      // User A created in Member (College) tenant
      userAName: `AT_C1464313_UserA_${randomPostfix}`,
    };

    // Lookup four capability sets that exist in both tenants (pick well-known ones)
    // S1, S2 in Member; S2, S3 in Central; S4 direct Central only
    const setNames = {
      s1: null,
      s2: null,
      s3: null,
      s4: null,
      s1Id: null,
      s2IdMember: null,
      s2IdCentral: null,
      s3Id: null,
      s4Id: null,
    };

    before('Create roles, user and assign capability sets', () => {
      cy.getAdminToken();

      // Fetch four capability sets from College (Member) tenant to use as S1..S4
      cy.setTenant(Affiliations.College);
      cy.getCapabilitySetsApi(4).then((sets) => {
        setNames.s1 = sets[0].name;
        setNames.s2 = sets[1].name;
        setNames.s3 = sets[2].name;
        setNames.s4 = sets[3].name;
        setNames.s1Id = sets[0].id;
        setNames.s2IdMember = sets[1].id;

        // Create R1 in Member with S1 and S2
        cy.createAuthorizationRoleApi(testData.roleR1Name).then((r1) => {
          testData.roleR1Id = r1.id;
          cy.addCapabilitySetsToNewRoleApi(testData.roleR1Id, [setNames.s1Id, setNames.s2IdMember]);
        });
      });

      // Fetch matching capability sets from Central for S2, S3, S4
      cy.resetTenant();
      cy.getCapabilitySetsApi(4).then((sets) => {
        // match by name so we use the Central record of S2 and S3/S4
        setNames.s2IdCentral = sets.find((s) => s.name === setNames.s2)?.id ?? sets[1].id;
        setNames.s3Id = sets.find((s) => s.name === setNames.s3)?.id ?? sets[2].id;
        setNames.s4Id = sets.find((s) => s.name === setNames.s4)?.id ?? sets[3].id;

        // Create R2 in Central with S2 and S3
        cy.createAuthorizationRoleApi(testData.roleR2Name).then((r2) => {
          testData.roleR2Id = r2.id;
          cy.addCapabilitySetsToNewRoleApi(testData.roleR2Id, [
            setNames.s2IdCentral,
            setNames.s3Id,
          ]);
        });
      });

      // Create User A in Member (College) tenant
      cy.setTenant(Affiliations.College);
      cy.createTempUser([]).then((userProperties) => {
        testData.userA = userProperties;

        // In Member: assign role R1 and directly assign S2
        cy.addRolesToNewUserApi(testData.userA.userId, [testData.roleR1Id]);
        cy.addCapabilitySetsToNewUserApi(testData.userA.userId, [setNames.s2IdMember]);

        // In Central: assign role R2 and directly assign S3 and S4
        cy.resetTenant();
        cy.addRolesToNewUserApi(testData.userA.userId, [testData.roleR2Id]);
        cy.addCapabilitySetsToNewUserApi(testData.userA.userId, [setNames.s3Id, setNames.s4Id]);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(testData.userA.userId);
      cy.deleteAuthorizationRoleApi(testData.roleR1Id);
      cy.resetTenant();
      cy.deleteAuthorizationRoleApi(testData.roleR2Id);
    });

    it(
      'C1464313 Capability sets query returns non-overlapping tenant-specific assignments for a user created in a Member tenant (eureka)',
      { tags: ['extendedPathECS', 'eureka', 'C1464313'] },
      () => {
        // Step 1: query from Member — expect S1 and S2 only (S2 deduplicated)
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          tenantId: Affiliations.College,
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          const names = body.userCapabilitySets[0].capabilitySetNames;
          expect(names).to.have.members([setNames.s1, setNames.s2]);
          // S2 deduplicated — appears exactly once
          expect(names.filter((n) => n === setNames.s2)).to.have.lengthOf(1);
        });

        // Step 2: query from Central — expect S2, S3, S4 (S3 deduplicated; S1 absent)
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          tenantId: Affiliations.Consortia,
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          const names = body.userCapabilitySets[0].capabilitySetNames;
          expect(names).to.have.members([setNames.s2, setNames.s3, setNames.s4]);
          // S2 and S3 each deduplicated despite two assignment paths
          expect(names.filter((n) => n === setNames.s2)).to.have.lengthOf(1);
          expect(names.filter((n) => n === setNames.s3)).to.have.lengthOf(1);
        });

        // Step 3: same as step 1 but with all 4 set names in whitelist — Member still returns only S1+S2
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          tenantId: Affiliations.College,
          capabilitySetNames: [setNames.s1, setNames.s2, setNames.s3, setNames.s4],
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          const names = body.userCapabilitySets[0].capabilitySetNames;
          expect(names).to.have.members([setNames.s1, setNames.s2]);
        });

        // Step 4: same as step 3 but from Central — Central returns S2+S3+S4; S1 does not leak
        cy.queryCapabilitySetsForUsersApi([testData.userA.userId], {
          tenantId: Affiliations.Consortia,
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
