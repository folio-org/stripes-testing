import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Consortia', () => {
    const testData = {
      user: {},
      listName: `AT_C784464_List_${getRandomPostfix()}`,
      instanceTitle: `AT_C784464_Instance_${getRandomPostfix()}`,
    };
    const userPermissions = [
      Permissions.listsAll.gui,
      Permissions.uiOrganizationsViewEditCreate.gui,
      Permissions.uiOrganizationsViewEditDelete.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersDelete.gui,
      Permissions.inventoryAll.gui,
    ];
    const memberAffiliations = [Affiliations.College, Affiliations.University];

    const addEurekaCapabilitySets = (tenantId) => {
      const capabilitySetIds = [];

      cy.setTenant(tenantId);
      cy.then(() => {
        [
          CapabilitySets.moduleListsManage,
          CapabilitySets.uiOrganizationsView,
          CapabilitySets.uiOrdersOrdersCreate,
          CapabilitySets.uiInventory,
        ].forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabilitySetId) => {
            capabilitySetIds.push(capabilitySetId);
          });
        });
      }).then(() => {
        cy.addCapabilitySetsToNewUserApi(testData.user.userId, capabilitySetIds, true);
      });
    };

    const affiliateUserToMemberTenants = () => {
      memberAffiliations.forEach((affiliation) => {
        cy.affiliateUserToTenant({
          tenantId: affiliation,
          userId: testData.user.userId,
          permissions: userPermissions,
        });
        if (Cypress.env('eureka')) addEurekaCapabilitySets(affiliation);
      });
      cy.setTenant(Affiliations.Consortia);
    };

    before('Create test user and central tenant holding', () => {
      if (!Cypress.env('ecsEnabled')) {
        throw new Error('This spec must be run against an ECS environment with ecsEnabled=true.');
      }

      cy.clearLocalStorage();
      cy.setTenant(Affiliations.Consortia);
      cy.getAdminToken();

      cy.getLocations({ limit: 1 }).then((location) => {
        testData.locationId = location.id;
      });
      InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
        testData.sourceId = folioSource.id;
      });
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });
      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title: testData.instanceTitle,
            instanceTypeId: testData.instanceTypeId,
          },
        }).then(({ instanceId }) => {
          testData.instanceId = instanceId;
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId,
            permanentLocationId: testData.locationId,
            sourceId: testData.sourceId,
          }).then((holding) => {
            testData.holdingId = holding.id;
          });
        });
      });

      cy.createTempUser(userPermissions).then((userProperties) => {
        testData.user = userProperties;
        if (Cypress.env('eureka')) addEurekaCapabilitySets(Affiliations.Consortia);
        affiliateUserToMemberTenants();
      });
    });

    after('Delete test user and central tenant holding', () => {
      cy.setTenant(Affiliations.Consortia);
      cy.getAdminToken();
      if (testData.holdingId) {
        InventoryHoldings.deleteHoldingRecordViaApi(testData.holdingId);
      }
      if (testData.instanceId) {
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      }
      if (testData.user.userId) {
        Users.deleteViaApi(testData.user.userId);
      }
      cy.resetTenant();
    });

    it(
      'C784464 Holdings effective location / library are showing aggregated values in ECS (corsair)',
      { tags: ['criticalPathECS', 'corsair', 'C784464'] },
      () => {
        cy.setTenant(Affiliations.Consortia);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.openNewListPane();
        Lists.setName(testData.listName);
        Lists.selectRecordType('Holdings');
        Lists.buildQuery();
        QueryModal.exists();
        QueryModal.testQueryDisabled();
        QueryModal.cancelDisabled(false);
        QueryModal.xButttonDisabled(false);
        QueryModal.verifyModalContent(true);

        QueryModal.selectField(holdingsFieldValues.affiliationName);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect(tenantNames.central);
        QueryModal.testQueryDisabled(false);

        cy.intercept('GET', '**/query/**').as('query');
        QueryModal.testQuery();
        QueryModal.waitForQueryCompleted('@query');
        Lists.verifyPreviewOfRecordsMatched();

        QueryModal.addNewRow();
        QueryModal.verifyEmptyField(1);

        QueryModal.selectField(holdingsFieldValues.effectiveLocationName, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
        QueryModal.verifyValueMultiselectContainsValuesFromPreviewTableColumn(
          holdingsFieldValues.effectiveLocationName,
          1,
          true,
        );

        QueryModal.selectField(holdingsFieldValues.effectiveLibraryName, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
        QueryModal.verifyValueMultiselectContainsValuesFromPreviewTableColumn(
          holdingsFieldValues.effectiveLibraryName,
          1,
        );
      },
    );
  });
});
