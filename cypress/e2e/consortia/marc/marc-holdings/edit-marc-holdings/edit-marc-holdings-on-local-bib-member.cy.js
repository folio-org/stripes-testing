import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          user: {},
          marcBibTitle: `AT_C788743_MarcBibInstance_${randomPostfix}`,
          tag004: '004',
          tag008: '008',
          tag852: '852',
          tag866: '866',
          callNumberValue: `AT_C788743_CallNumber_${randomPostfix}`,
          callNumberUpdatedValue: `AT_C788743_CallNumber_Updated_${randomPostfix}`,
          localHoldingsSourceViewLabel: 'Local MARC holdings record',
          heldbyAccordionName: 'Held by',
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

        let createdInstanceId;
        let locationCode;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.then(() => {
            cy.setTenant(Affiliations.College);
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((location) => {
              locationCode = location.code;
            });
          })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser(userPermissions.college).then((userProperties) => {
                testData.user = userProperties;

                cy.resetTenant();
                cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions.central);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);

                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(
                  testData.user.userId,
                  userPermissions.university,
                );
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
                createdInstanceId = instanceId;

                cy.getInstanceById(instanceId).then((instanceData) => {
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
                      content: `$b ${locationCode} $h ${testData.callNumberValue}`,
                      indicators: ['\\', '\\'],
                      tag: testData.tag852,
                    },
                  ]);
                });
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
          Users.deleteViaApi(testData.user.userId);
        });

        it(
          'C788743 Edit MARC holdings record on Local MARC bib from Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C788743'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 1: Click on "View holdings" button
            InventoryInstance.openHoldingView();
            HoldingsRecordView.checkHoldingRecordViewOpened();

            // Step 2: Click "Actions" >> "Edit in quickMARC"
            HoldingsRecordView.editInQuickMarc();
            QuickMarcEditor.waitLoading();

            // Step 3: Do some change in any MARC field
            QuickMarcEditor.updateExistingField(
              testData.tag852,
              `$b ${locationCode} $h ${testData.callNumberUpdatedValue}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag852,
              `$b ${locationCode} $h ${testData.callNumberUpdatedValue}`,
            );
            QuickMarcEditor.checkButtonsEnabled();

            // Step 4: Click "Save & close" button
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveHoldings();
            HoldingsRecordView.checkHoldingRecordViewOpened();
            HoldingsRecordView.checkCallNumber(testData.callNumberUpdatedValue);

            // Step 5: Click "Actions" >> "View source"
            HoldingsRecordView.viewSource();
            InventoryViewSource.waitHoldingLoading();
            InventoryViewSource.contains(testData.localHoldingsSourceViewLabel);
            InventoryViewSource.contains(testData.callNumberUpdatedValue);
          },
        );
      });
    });
  });
});
