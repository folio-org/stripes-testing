describe('Eureka', () => {
  describe('Tenants', () => {
    const allCapabilities = [];
    const allCapabilitySets = [];
    const capabilityPermissionDuplicates = [];
    const capabilitySetPermissionDuplicates = [];

    before('Get data', () => {
      cy.getAdminToken();
      cy.getCapabilitiesApi(5000, false).then((capabs) => {
        allCapabilities.push(...capabs);
      });
      cy.getCapabilitySetsApi().then((capabSets) => {
        allCapabilitySets.push(...capabSets);
      });
    });

    it(
      'C829890 No duplicate capabilities/sets (with the same "permission" attribute) exist in the system (eureka)',
      { tags: ['criticalPath', 'eureka', 'C829890'] },
      () => {
        const uniqueCapabilityPermissions = new Set(
          allCapabilities.map((capability) => capability.permission),
        );
        const uniqueCapabilitySetPermissions = new Set(
          allCapabilitySets.map((set) => set.permission),
        );
        const capabilityDuplicatesInfo = [];
        const capabilitySetDuplicatesInfo = [];

        uniqueCapabilityPermissions.forEach((permission) => {
          const duplicateCapabilities = allCapabilities.filter(
            (capability) => capability.permission === permission,
          );
          if (duplicateCapabilities.length > 1) {
            capabilityPermissionDuplicates.push(permission);
            const associatedNames = duplicateCapabilities.map((capability) => capability.name);
            capabilityDuplicatesInfo.push({
              permission,
              capabilities: associatedNames,
            });
          }
        });
        uniqueCapabilitySetPermissions.forEach((permission) => {
          const duplicateCapabilitySets = allCapabilitySets.filter(
            (set) => set.permission === permission,
          );
          if (duplicateCapabilitySets.length > 1) {
            capabilitySetPermissionDuplicates.push(permission);
            const associatedNames = duplicateCapabilitySets.map((capability) => capability.name);
            capabilitySetDuplicatesInfo.push({
              permission,
              capabilitySets: associatedNames,
            });
          }
        });

        if (capabilityDuplicatesInfo.length > 0) {
          cy.log(
            `Duplicate capabilities found:\n${JSON.stringify(capabilityDuplicatesInfo, null, 2)}`,
          );
        }
        if (capabilitySetDuplicatesInfo.length > 0) {
          cy.log(
            `Duplicate capability sets found:\n${JSON.stringify(capabilitySetDuplicatesInfo, null, 2)}`,
          );
        }

        cy.then(() => {
          cy.expect(
            capabilityPermissionDuplicates.length + capabilitySetPermissionDuplicates.length,
            'Capability/set duplicates count',
          ).to.equal(0);
        });
      },
    );
  });
});
