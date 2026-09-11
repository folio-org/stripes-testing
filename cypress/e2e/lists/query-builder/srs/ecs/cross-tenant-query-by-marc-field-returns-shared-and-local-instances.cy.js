import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import { Lists } from '../../../../../support/fragments/lists/lists';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

const testCaseId = 'C1464355';
const randomPostfix = getRandomPostfix();
// Unique beginning of the 245 field value, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const title245 = `${marcPrefix}_Consortium query test`;
const authorName = 'Test Author';
const marc245Values = [title245, authorName];
const marcFieldOption = 'MARC bibliographic — MARC';
const marc245Column = 'MARC 245';
const centralListName = `AT_${testCaseId}_CentralList_${randomPostfix}`;
const memberListName = `AT_${testCaseId}_MemberList_${randomPostfix}`;
// The quickMARC permission is a precondition of the test case: the records below are created through the
// same records-editor API that "New MARC bibliographic record" uses
const userPermissions = [
  Permissions.listsAll.gui,
  Permissions.inventoryAll.gui,
  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
];
const marcFields = [
  { tag: '008', content: QuickMarcEditor.defaultValid008Values },
  { tag: '245', content: `$a ${title245} $c ${authorName}`, indicators: ['1', '0'] },
];
// A MARC bibliographic record created in the Central tenant is shared, the one created in a member tenant
// is local to it
const sharedInstance = { affiliationName: null };
const localInstance = { affiliationName: null };

let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Instances with MARC bibliographic', () => {
      describe('ECS', () => {
        before('Create test data', () => {
          if (!Cypress.env('ecsEnabled')) {
            throw new Error(
              'This spec must be run against an ECS environment with ecsEnabled=true.',
            );
          }
          sharedInstance.affiliationName = tenantNames.central;
          localInstance.affiliationName = tenantNames.college;

          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser(userPermissions)
            .then((userProperties) => {
              user = userProperties;

              cy.affiliateUserToTenant({
                tenantId: Affiliations.College,
                userId: user.userId,
                permissions: userPermissions,
              });
            })
            .then(() => {
              // Shared instance in the Central tenant
              cy.resetTenant();
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcFields).then(
                (instanceId) => {
                  sharedInstance.id = instanceId;
                  cy.getInstanceById(instanceId).then((instanceData) => {
                    sharedInstance.hrid = instanceData.hrid;
                  });
                },
              );
            })
            .then(() => {
              // Local instance in the member tenant
              cy.withinTenant(Affiliations.College, () => {
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcFields).then(
                  (instanceId) => {
                    localInstance.id = instanceId;
                    cy.getInstanceById(instanceId).then((instanceData) => {
                      localInstance.hrid = instanceData.hrid;
                    });
                  },
                );
              });
            });
        });

        after('Delete test data', () => {
          // Nothing to clean up when the environment check of the "before" hook stopped the setup
          if (!user?.username) return;

          // Each list and each instance belongs to the tenant it was created in. The test user exists only
          // in the Keycloak realm of the Central tenant, so the admin token is used for both tenants
          cy.resetTenant();
          cy.getAdminToken();
          Lists.deleteListByNameViaApi(centralListName, true);
          InventoryInstance.deleteInstanceViaApi(sharedInstance.id);
          cy.withinTenant(Affiliations.College, () => {
            Lists.deleteListByNameViaApi(memberListName, true);
            InventoryInstance.deleteInstanceViaApi(localInstance.id);
          });
          Users.deleteViaApi(user.userId);
        });

        it(
          'C1464355 Cross-tenant query by MARC field returns both shared and local instances from Central and Member tenant (consortia) (athena)',
          { tags: ['extendedPathECS', 'athena', 'C1464355'] },
          () => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Step 1: Create new list with "Instances with MARC bibliographic" and open "Build query"
            Lists.openNewListPane();
            Lists.setName(centralListName);
            Lists.selectRecordType(Lists.recordTypes.instancesWithMarcBibliographic);
            Lists.buildQuery();
            QueryModal.verify();

            // Step 2: Query by marc_245 field using "contains" operator from the Central tenant
            QueryModal.selectField(marcFieldOption);
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.fillInMarcTag('245');
            QueryModal.verifyMarcTagValue('245');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues();
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.fillInMarcValueTextfield(title245);
            QueryModal.verifyMarcValueTextfield(title245);
            QueryModal.verifyQueryAreaContent(`(${marc245Column} contains ${title245})`);
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyNumberOfMatchedRecords(2);
            QueryModal.verifyNumberOfRowsInPreviewTable(2);
            [sharedInstance, localInstance].forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(instance.hrid, marc245Column, marc245Values);
            });

            // Step 3: The queried MARC column is locked visible at the end of "Show columns"
            QueryModal.clickShowColumnsButton();
            QueryModal.verifyShowColumnsMenuDisplayed();
            QueryModal.verifyMarcColumnLockedInShowColumns(marc245Column);
            QueryModal.clickShowColumnsButton();

            // Step 4: Check the "Instance — Shared" and "Instance — Affiliation name" columns
            QueryModal.verifyResultTableColumnValues(
              sharedInstance.hrid,
              instanceFieldValues.instanceShared,
              ['Shared'],
            );
            QueryModal.verifyResultTableColumnValues(
              sharedInstance.hrid,
              instanceFieldValues.affiliationName,
              [sharedInstance.affiliationName],
            );
            QueryModal.verifyResultTableColumnValues(
              localInstance.hrid,
              instanceFieldValues.instanceShared,
              ['Local'],
            );
            QueryModal.verifyResultTableColumnValues(
              localInstance.hrid,
              instanceFieldValues.affiliationName,
              [localInstance.affiliationName],
            );

            // Step 5: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(centralListName);
            Lists.verifyQuery(`${marc245Column} contains ${title245}`);
            Lists.verifyRefreshCompleteCallout(2);

            // Step 6: Click "View updated list" link and check the same values in the saved list
            Lists.viewUpdatedList();
            [sharedInstance, localInstance].forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(
                instance.hrid,
                marc245Column,
                marc245Values,
                { inBuildQueryForm: false },
              );
            });
            QueryModal.verifyResultTableColumnValues(
              sharedInstance.hrid,
              instanceFieldValues.instanceShared,
              ['Shared'],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              localInstance.hrid,
              instanceFieldValues.instanceShared,
              ['Local'],
              { inBuildQueryForm: false },
            );

            // Step 7: The MARC column is locked visible in the "Actions" menu of the list as well
            Lists.openActions();
            QueryModal.verifyMarcColumnLockedInShowColumns(marc245Column);
            Lists.openActions();

            // Step 8: Switch active affiliation to the member tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            Lists.waitLoading();

            // Step 9: Run the same query from the member tenant
            Lists.openNewListPane();
            Lists.setName(memberListName);
            Lists.selectRecordType(Lists.recordTypes.instancesWithMarcBibliographic);
            Lists.buildQuery();
            QueryModal.verify();
            QueryModal.selectField(marcFieldOption);
            QueryModal.fillInMarcTag('245');
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.fillInMarcValueTextfield(title245);
            QueryModal.verifyQueryAreaContent(`(${marc245Column} contains ${title245})`);
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyNumberOfMatchedRecords(2);
            QueryModal.verifyNumberOfRowsInPreviewTable(2);
            [sharedInstance, localInstance].forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(instance.hrid, marc245Column, marc245Values);
            });

            // Step 10: Check the "Instance — Shared" and "Instance — Affiliation name" columns
            QueryModal.verifyResultTableColumnValues(
              sharedInstance.hrid,
              instanceFieldValues.instanceShared,
              ['Shared'],
            );
            QueryModal.verifyResultTableColumnValues(
              sharedInstance.hrid,
              instanceFieldValues.affiliationName,
              [sharedInstance.affiliationName],
            );
            QueryModal.verifyResultTableColumnValues(
              localInstance.hrid,
              instanceFieldValues.instanceShared,
              ['Local'],
            );
            QueryModal.verifyResultTableColumnValues(
              localInstance.hrid,
              instanceFieldValues.affiliationName,
              [localInstance.affiliationName],
            );

            // Step 11: Add "Instance — Affiliation name" equals Central tenant → only the shared instance
            QueryModal.addNewRow();
            QueryModal.verifyBooleanColumn(1);
            QueryModal.selectField(instanceFieldValues.affiliationName, 1);
            QueryModal.verifySelectedField(instanceFieldValues.affiliationName, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
            QueryModal.chooseValueSelect(tenantNames.central, 1);
            QueryModal.verifyQueryAreaContent(
              `(${marc245Column} contains ${title245}) AND (instance.tenant_name == ${tenantNames.central})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyNumberOfMatchedRecords(1);
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
            QueryModal.verifyResultTableColumnValues(
              sharedInstance.hrid,
              instanceFieldValues.instanceShared,
              ['Shared'],
            );
            QueryModal.verifyResultTableColumnValues(
              sharedInstance.hrid,
              instanceFieldValues.affiliationName,
              [sharedInstance.affiliationName],
            );
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(localInstance.hrid);

            // Step 12: Update the second condition to the member tenant → only the local instance
            QueryModal.chooseValueSelect(tenantNames.college, 1);
            QueryModal.verifyQueryAreaContent(
              `(${marc245Column} contains ${title245}) AND (instance.tenant_name == ${tenantNames.college})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyNumberOfMatchedRecords(1);
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
            QueryModal.verifyResultTableColumnValues(
              localInstance.hrid,
              instanceFieldValues.instanceShared,
              ['Local'],
            );
            QueryModal.verifyResultTableColumnValues(
              localInstance.hrid,
              instanceFieldValues.affiliationName,
              [localInstance.affiliationName],
            );
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(sharedInstance.hrid);

            // Step 13: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(memberListName);
            Lists.getQueryText().should(
              'include',
              `(${marc245Column} contains ${title245}) AND (instance.tenant_name == ${tenantNames.college})`,
            );
            Lists.verifyRefreshCompleteCallout(1);

            // Step 14: Click "View updated list" link, only the local instance is in the saved list
            Lists.viewUpdatedList();
            QueryModal.verifyResultTableColumnValues(
              localInstance.hrid,
              marc245Column,
              marc245Values,
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              localInstance.hrid,
              instanceFieldValues.instanceShared,
              ['Local'],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              localInstance.hrid,
              instanceFieldValues.affiliationName,
              [localInstance.affiliationName],
              { inBuildQueryForm: false },
            );
            Lists.verifyRecordValueAbsentInResultTable(sharedInstance.hrid);
            cy.screenshot('C1464355-passed');
          },
        );
      });
    });
  });
});
