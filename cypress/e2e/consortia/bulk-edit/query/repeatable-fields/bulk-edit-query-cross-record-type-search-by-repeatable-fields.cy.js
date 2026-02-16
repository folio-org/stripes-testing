import permissions from '../../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
  holdingsFieldValues,
  itemFieldValues,
} from '../../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../../support/constants';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';

let user;
let instanceTypeId;
let locationId;
let materialTypeId;
let loanTypeId;
let sourceId;
const userPermissions = [
  permissions.bulkEditView.gui,
  permissions.uiInventoryViewInstances.gui,
  permissions.bulkEditQueryView.gui,
];
const postfix = randomFourDigitNumber();
const sharedInstance = {
  title: `AT_C926163_${postfix}_SharedInstance_${getRandomPostfix()}`,
  instanceId: '',
  hrid: '',
  subjectHeading: 'Tour de France (Bicycle race)',
  holdingStatement: 'History.',
};

const localInstance = {
  title: `AT_C926163_${postfix}_LocalInstance_${getRandomPostfix()}`,
  instanceId: '',
  hrid: '',
  subjectHeading: 'Tour de France (Bicycle race)',
  holdingStatement: 'History.',
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Consortia', () => {
      describe('Repeatable fields', () => {
        before('Create test data', () => {
          cy.clearLocalStorage();
          cy.getAdminToken();

          cy.createTempUser(userPermissions).then((userProperties) => {
            user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, userPermissions);
            cy.resetTenant();

            cy.getInstanceTypes({ limit: 1 })
              .then((instanceTypeData) => {
                instanceTypeId = instanceTypeData[0].id;
              })
              .then(() => {
                // Create shared instance in Central tenant
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: sharedInstance.title,
                    subjects: [
                      {
                        value: sharedInstance.subjectHeading,
                      },
                    ],
                  },
                }).then((createdInstanceData) => {
                  sharedInstance.instanceId = createdInstanceData.instanceId;

                  cy.getInstanceById(sharedInstance.instanceId).then((instanceData) => {
                    sharedInstance.hrid = instanceData.hrid;
                  });
                });
              })
              .then(() => {
                // Create local instance in Member tenant
                cy.setTenant(Affiliations.College);
                cy.getLocations({ limit: 1 }).then((resp) => {
                  locationId = resp.id;
                });
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  sourceId = folioSource.id;
                });
                cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
                  materialTypeId = materialType.id;
                });
                cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` })
                  .then((loanTypes) => {
                    loanTypeId = loanTypes[0].id;
                  })
                  .then(() => {
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId,
                        title: localInstance.title,
                        subjects: [
                          {
                            value: localInstance.subjectHeading,
                          },
                        ],
                      },
                    }).then((createdInstanceData) => {
                      localInstance.instanceId = createdInstanceData.instanceId;

                      cy.getInstanceById(localInstance.instanceId).then((instanceData) => {
                        localInstance.hrid = instanceData.hrid;
                      });
                    });
                  });
              })
              .then(() => {
                // Create holdings and items for both instances
                cy.wrap([sharedInstance, localInstance]).each((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.instanceId,
                    permanentLocationId: locationId,
                    sourceId,
                    holdingsStatements: [
                      {
                        statement: instance.holdingStatement,
                      },
                    ],
                  }).then((holding) => {
                    instance.holdingId = holding.id;
                    instance.holdingHrid = holding.hrid;

                    InventoryItems.createItemViaApi({
                      holdingsRecordId: holding.id,
                      materialType: { id: materialTypeId },
                      permanentLoanType: { id: loanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    }).then((item) => {
                      instance.itemId = item.id;
                      instance.itemHrid = item.hrid;
                    });
                  });
                });
              });

            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);

          cy.setTenant(Affiliations.College);
          [sharedInstance, localInstance].forEach((instance) => {
            cy.deleteItemViaApi(instance.itemId);
            cy.deleteHoldingRecordViaApi(instance.holdingId);
          });

          InventoryInstance.deleteInstanceViaApi(localInstance.instanceId);

          cy.resetTenant();
          InventoryInstance.deleteInstanceViaApi(sharedInstance.instanceId);
        });

        it(
          'C926163 Cross record type search by repeatable fields in ECS environment (consortia) (firebird)',
          { tags: ['criticalPathECS', 'firebird', 'C926163'] },
          () => {
            const holdingHrids = [sharedInstance.holdingHrid, localInstance.holdingHrid];
            const itemHrids = [sharedInstance.itemHrid, localInstance.itemHrid];

            // Step 1: Search holdings by Instance — Subjects — Subject headings
            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkHoldingsRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.verify();

            QueryModal.selectField(instanceFieldValues.subjectsSubjectHeadings);
            QueryModal.verifySelectedField(instanceFieldValues.subjectsSubjectHeadings);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(sharedInstance.subjectHeading);
            QueryModal.addNewRow();
            QueryModal.selectField(itemFieldValues.instanceTitle, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
            QueryModal.fillInValueTextfield(`AT_C926163_${postfix}_`, 1);
            QueryModal.clickTestQuery();
            QueryModal.verifyQueryAreaContent(
              `(instance.subjects[*]->subject_value == ${sharedInstance.subjectHeading}) AND (instance.title starts with AT_C926163_${postfix}_)`,
            );
            QueryModal.verifyPreviewOfRecordsMatched();

            // Verify subjects embedded table for both holdings
            holdingHrids.forEach((holdingHrid) => {
              QueryModal.verifySubjectsEmbeddedTableInQueryModal(holdingHrid, [
                { subjectHeadings: sharedInstance.subjectHeading },
              ]);
            });

            // Step 2: Click "Run query" button
            QueryModal.clickRunQuery();
            QueryModal.verifyClosed();

            holdingHrids.forEach((holdingHrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                holdingHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHrid,
              );
            });

            // Step 3: Select "Inventory - items" and click "Build query"
            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkItemsRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.verify();

            // Step 4: Search items by Holdings — Statements — Statement
            QueryModal.selectField(holdingsFieldValues.statementsStatement);
            QueryModal.verifySelectedField(holdingsFieldValues.statementsStatement);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(sharedInstance.holdingStatement);
            QueryModal.addNewRow();
            QueryModal.selectField(itemFieldValues.instanceTitle, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
            QueryModal.fillInValueTextfield(`AT_C926163_${postfix}_`, 1);
            QueryModal.clickTestQuery();
            QueryModal.verifyQueryAreaContent(
              `(holdings.holdings_statements[*]->statement == ${sharedInstance.holdingStatement}) AND (instances.title starts with AT_C926163_${postfix}_)`,
            );
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.clickShowColumnsButton();
            QueryModal.clickCheckboxInShowColumns(itemFieldValues.itemHrid);

            // Verify statements embedded table for both items
            itemHrids.forEach((itemHrid) => {
              QueryModal.verifyStatementsEmbeddedTableInQueryModal(itemHrid, [
                { statement: sharedInstance.holdingStatement },
              ]);
            });

            // Step 5: Click "Run query" button
            QueryModal.clickRunQuery();
            QueryModal.verifyClosed();

            // Verify both items appear in the results accordion
            itemHrids.forEach((itemHrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                itemHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
                itemHrid,
              );
            });

            // Step 6: Switch affiliation to member tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Step 7: Select "Inventory - items" and click "Build query"
            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkItemsRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.verify();

            // Step 8: Search items by Instance — Subjects — Subject headings
            QueryModal.selectField(instanceFieldValues.subjectsSubjectHeadings);
            QueryModal.verifySelectedField(instanceFieldValues.subjectsSubjectHeadings);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(sharedInstance.subjectHeading);
            QueryModal.addNewRow();
            QueryModal.selectField(itemFieldValues.instanceTitle, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
            QueryModal.fillInValueTextfield(`AT_C926163_${postfix}_`, 1);
            QueryModal.clickTestQuery();
            QueryModal.verifyQueryAreaContent(
              `(instances.subjects[*]->subject_value == ${sharedInstance.subjectHeading}) AND (instances.title starts with AT_C926163_${postfix}_)`,
            );
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.clickShowColumnsButton();
            QueryModal.clickCheckboxInShowColumns(itemFieldValues.itemHrid);

            // Verify subjects embedded table for both items
            itemHrids.forEach((itemHrid) => {
              QueryModal.verifySubjectsEmbeddedTableInQueryModal(itemHrid, [
                { subjectHeadings: sharedInstance.subjectHeading },
              ]);
            });

            // Step 9: Click "Run query" button
            QueryModal.clickRunQuery();
            QueryModal.verifyClosed();

            // Verify both items appear in the results accordion
            itemHrids.forEach((itemHrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                itemHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
                itemHrid,
              );
            });
          },
        );
      });
    });
  });
});
