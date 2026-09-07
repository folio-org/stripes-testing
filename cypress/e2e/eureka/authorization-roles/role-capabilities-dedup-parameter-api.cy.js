import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleNamePrefix: `AT_C1375886_UserRole_${getRandomPostfix()}`,
        capabilitySet: CapabilitySets.acquisitionUnitsMembershipsManage,
        capability: Capabilities.acquisitionUnitsMembershipsItemView,
        invalidDedupValue: 'kekeke',
        roleIds: [],
      };
      const roleNames = Array.from({ length: 3 }, (_, i) => `${testData.roleNamePrefix}_${i}`);

      before('Create test data', () => {
        cy.then(() => {
          cy.getAdminToken();
          roleNames.forEach((roleName) => {
            cy.createAuthorizationRoleApi(roleName).then((role) => {
              testData.roleIds.push(role.id);
            });
          });
          cy.getCapabilityIdViaApi(testData.capability).then((capabId) => {
            testData.capabId = capabId;
          });
          cy.getCapabilitySetIdViaApi(testData.capabilitySet).then((capabSetId) => {
            testData.capabSetId = capabSetId;
          });
        })
          .then(() => {
            cy.addCapabilitiesToNewRoleApi(testData.roleIds[0], [testData.capabId]);
            cy.addCapabilitySetsToNewRoleApi(testData.roleIds[1], [testData.capabSetId]);
            cy.addCapabilitiesToNewRoleApi(testData.roleIds[2], [testData.capabId]);
          })
          .then(() => {
            cy.addCapabilitySetsToNewRoleApi(testData.roleIds[2], [testData.capabSetId]);
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        testData.roleIds.forEach((roleId) => {
          if (roleId) cy.deleteAuthorizationRoleApi(roleId);
        });
      });

      it(
        'C1375886 Dedup parameter is added to capability response (eureka)',
        { tags: ['backend', 'extendedPath', 'eureka', 'C1375886'] },
        () => {
          cy.getAdminToken();

          cy.getCapabilitiesForRoleApi(testData.roleIds[0]).then(({ status, body }) => {
            expect(status).to.eq(200);
            const targetCapabs = body.capabilities.filter((capab) => capab.id === testData.capabId);
            expect(targetCapabs).to.have.length(1);
            expect(targetCapabs[0]?.direct).to.eq(true);
          });

          cy.getCapabilitiesForRoleApi(testData.roleIds[1], { expand: true }).then(
            ({ status, body }) => {
              expect(status).to.eq(200);
              const targetCapabs = body.capabilities.filter(
                (capab) => capab.id === testData.capabId,
              );
              expect(targetCapabs).to.have.length(1);
              expect(targetCapabs[0]?.direct).to.eq(false);
            },
          );

          cy.getCapabilitiesForRoleApi(testData.roleIds[2], { expand: true, dedup: false }).then(
            ({ status, body }) => {
              expect(status).to.eq(200);
              const targetCapabs = body.capabilities.filter(
                (capab) => capab.id === testData.capabId,
              );
              expect(targetCapabs).to.have.length(2);
              expect(targetCapabs.map((capab) => capab?.direct).sort()).to.deep.eq([false, true]);
            },
          );

          cy.getCapabilitiesForRoleApi(testData.roleIds[2], { expand: true }).then(
            ({ status, body }) => {
              expect(status).to.eq(200);
              const targetCapabs = body.capabilities.filter(
                (capab) => capab.id === testData.capabId,
              );
              expect(targetCapabs).to.have.length(1);
              expect(targetCapabs[0]?.direct).to.eq(true);
            },
          );

          cy.getCapabilitiesForRoleApi(testData.roleIds[2], {
            dedup: testData.invalidDedupValue,
          }).then(({ status }) => {
            expect(status).to.eq(400);
          });
        },
      );
    });
  });
});
