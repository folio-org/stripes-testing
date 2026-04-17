import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import Permissions from '../../../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../../support/fragments/settings/tenant/location-setup/locations';
import Location from '../../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          marcBibTitle: `AT_C788741_MarcBibInstance_${randomPostfix}`,
          tag004: '004',
          tag008: '008',
          tag852: '852',
          tag866: '866',
          tag866Value: `AT_C788741_HoldingsStatement_${randomPostfix}`,
          tag866UpdatedValue: `AT_C788741_HoldingsStatement_Updated_${randomPostfix}`,
          localMarcHoldingsLabel: 'Local MARC holdings record',
          heldByAccordionName: 'Held by',
        };

        const userPermissions = {
          central: [Permissions.uiInventoryViewInstances.gui],
          college: [
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
          ],
          university: [
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
          ],
        };
        const eurekaCentralCapabSets = [CapabilitySets.uiInventoryInstanceView];
        const eurekaCollegeCapabSets = [
          CapabilitySets.uiInventoryInstanceView,
          CapabilitySets.uiQuickMarcQuickMarcHoldingsEditorManage,
          CapabilitySets.uiQuickMarcQuickMarcHoldingsEditorCreate,
        ];
        const eurekaUniversityCapabSets = [
          CapabilitySets.uiInventoryInstanceView,
          CapabilitySets.uiQuickMarcQuickMarcHoldingsEditorView,
        ];

        let createdInstanceId;
        let user;
        const servicePoints = {
          [Affiliations.College]: ServicePoints.getDefaultServicePointWithPickUpLocation(),
        };
        const locations = {};

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.then(() => {
            cy.setTenant(Affiliations.College);
            ServicePoints.createViaApi(servicePoints[Affiliations.College]);
            locations[Affiliations.College] = Location.getDefaultLocation(
              servicePoints[Affiliations.College].id,
            );
            Locations.createViaApi(locations[Affiliations.College]);
          })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser(userPermissions.college).then((userProperties) => {
                user = userProperties;

                cy.resetTenant();
                cy.assignPermissionsToExistingUser(user.userId, userPermissions.central);
                if (Cypress.env('eureka')) {
                  cy.assignCapabilitiesToExistingUser(user.userId, [], eurekaCentralCapabSets);
                }

                cy.assignAffiliationToUser(Affiliations.University, user.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(user.userId, userPermissions.university);
                if (Cypress.env('eureka')) {
                  cy.assignCapabilitiesToExistingUser(user.userId, [], eurekaUniversityCapabSets);
                }
                cy.resetTenant();
                if (Cypress.env('eureka')) {
                  cy.setTenant(Affiliations.College);
                  cy.assignCapabilitiesToExistingUser(user.userId, [], eurekaCollegeCapabSets);
                  cy.resetTenant();
                }
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
                createdInstanceId = instanceId;
              });
            })
            .then(async () => {
              cy.setTenant(Affiliations.College);
              await cy.wait(20000);
              cy.getInstanceById(createdInstanceId, {
                'x-okapi-tenant': Affiliations.Consortia,
              }).then((instanceData) => {
                cy.createMarcHoldingsViaAPI(instanceData.id, [
                  {
                    content: instanceData.hrid,
                    tag: testData.tag004,
                  },
                  {
                    content: QuickMarcEditor.defaultValid008HoldingsValues,
                    tag: testData.tag008,
                  },
                  {
                    content: `$b ${locations[Affiliations.College].code}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag852,
                  },
                  {
                    content: `$a ${testData.tag866Value}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag866,
                  },
                ]);
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              InventorySearchAndFilter.clearDefaultFilter(testData.heldByAccordionName);
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitInstanceRecordViewOpened();
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
          cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${createdInstanceId}"` }).then(
            (instance) => {
              if (instance.holdings?.length) {
                instance.holdings.forEach((holding) => {
                  cy.deleteHoldingRecordViaApi(holding.id);
                });
              }
            },
          );
          Locations.deleteViaApi(locations[Affiliations.College]);
          ServicePoints.deleteViaApi(servicePoints[Affiliations.College].id);
          cy.resetTenant();
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        });

        it(
          'C788741 Edit MARC holdings record on Shared MARC bib from Member 1 tenant, verify in detail and source view (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C788741'] },
          () => {
            InventoryInstance.openHoldingView();
            HoldingsRecordView.checkHoldingRecordViewOpened();

            HoldingsRecordView.editInQuickMarc();
            QuickMarcEditor.waitLoading();

            QuickMarcEditor.updateExistingField(
              testData.tag866,
              `$a ${testData.tag866UpdatedValue}`,
            );
            QuickMarcEditor.checkButtonsEnabled();

            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveHoldings();
            HoldingsRecordView.checkHoldingRecordViewOpened();
            HoldingsRecordView.checkHoldingsStatement(testData.tag866UpdatedValue);

            HoldingsRecordView.viewSource();
            InventoryViewSource.contains(testData.localMarcHoldingsLabel);
            InventoryViewSource.contains(testData.tag866UpdatedValue);
          },
        );
      });
    });
  });
});
