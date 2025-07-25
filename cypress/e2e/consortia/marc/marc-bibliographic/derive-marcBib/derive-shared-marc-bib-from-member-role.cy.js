import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag245: '245',
        instanceTitle: `AT_C624270_MarcBibInstance_${randomPostfix}`,
        deriveSharedPaneheaderText: 'Derive a new shared MARC bib record',
        deriveLocalPaneheaderText: 'Derive a new local MARC bib record',
      };
      const derivedInstanceTitle = `${testData.instanceTitle} test`;

      const capabSetsForRole = [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Inventory Instance',
          action: CAPABILITY_ACTIONS.VIEW,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Quick-Marc Quick-Marc-Editor',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          type: CAPABILITY_TYPES.PROCEDURAL,
          resource: 'UI-Quick-Marc Quick-Marc-Editor Derive',
          action: CAPABILITY_ACTIONS.EXECUTE,
        },
      ];

      const marcInstanceFields = [
        {
          tag: '008',
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: '245',
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
      ];

      const createdInstanceIDs = [];
      const centralRoleCapabSetIds = [];
      const collegeRoleCapabSetIds = [];
      let centralRoleId;
      let collegeRoleId;
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.then(() => {
            cy.createAuthorizationRoleApi().then((role) => {
              centralRoleId = role.id;
              capabSetsForRole.forEach((capabilitySet) => {
                cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
                  centralRoleCapabSetIds.push(capabSetId);
                });
              });
            });
            // Create MARC bibliographic record to test deriving
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstanceFields,
            ).then((instanceId) => {
              createdInstanceIDs.push(instanceId);
            });
          }).then(() => {
            cy.setTenant(Affiliations.College);
            cy.createAuthorizationRoleApi().then((role) => {
              collegeRoleId = role.id;
              capabSetsForRole.forEach((capabilitySet) => {
                cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
                  collegeRoleCapabSetIds.push(capabSetId);
                });
              });
            });
          });
        });
      });

      before('Assign capability sets, roles', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.addCapabilitySetsToNewRoleApi(centralRoleId, centralRoleCapabSetIds);
        cy.addRolesToNewUserApi(user.userId, [centralRoleId]);
        cy.setTenant(Affiliations.College);
        cy.addCapabilitySetsToNewRoleApi(collegeRoleId, collegeRoleCapabSetIds);
        cy.addRolesToNewUserApi(user.userId, [collegeRoleId]);
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        createdInstanceIDs.forEach((instanceID) => {
          InventoryInstance.deleteInstanceViaApi(instanceID);
        });
        cy.deleteAuthorizationRoleApi(centralRoleId);
        cy.setTenant(Affiliations.College);
        createdInstanceIDs.forEach((instanceID) => {
          InventoryInstance.deleteInstanceViaApi(instanceID);
        });
        cy.deleteAuthorizationRoleApi(collegeRoleId);
      });

      it(
        'C624270 Derive Shared MARC bibliographic record from Member tenant by user with granted permissions via Permission set (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C624270'] },
        () => {
          // Step 1: Derive shared MARC bib record in Central tenant
          cy.resetTenant();
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);

          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(createdInstanceIDs[0]);
          InventoryInstances.selectInstanceById(createdInstanceIDs[0]);
          InventoryInstance.waitLoading();

          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(testData.deriveSharedPaneheaderText);
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${derivedInstanceTitle}`);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkInstanceTitle(derivedInstanceTitle);
          InventoryInstance.getId().then((id) => {
            createdInstanceIDs.push(id);
          });

          // Step 4: Switch to Member tenant and derive local MARC bib record
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(createdInstanceIDs[0]);
          InventoryInstances.selectInstanceById(createdInstanceIDs[0]);
          InventoryInstance.waitLoading();

          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(testData.deriveLocalPaneheaderText);
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${derivedInstanceTitle}`);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkInstanceTitle(derivedInstanceTitle);
          InventoryInstance.getId().then((id) => {
            createdInstanceIDs.push(id);
          });
        },
      );
    });
  });
});
