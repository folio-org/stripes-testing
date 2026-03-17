import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import QueryModal, {
  QUERY_OPERATIONS,
  holdingsFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import HoldingsNoteTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let centralSharedHoldingNoteTypeData;
const collegeHoldingNoteType = {
  name: `AT_C895648_College_NoteType_${randomFourDigitNumber()}`,
};
const universityHoldingNoteType = {
  name: `AT_C895648_University_NoteType_${randomFourDigitNumber()}`,
};
const centralSharedHoldingNoteType = {
  payload: {
    name: `AT_C895648_Central_Shared_NoteType_${randomFourDigitNumber()}`,
  },
};
const collegeHoldingNoteTypeNameWithAffiliation = `${collegeHoldingNoteType.name} (${Affiliations.College})`;
const universityHoldingNoteTypeNameWithAffiliation = `${universityHoldingNoteType.name} (${Affiliations.University})`;
const folioInstance = {
  title: `AT_C895648_FolioInstance_${getRandomPostfix()}`,
  uuid: null,
  collegeHoldingId: null,
  universityHoldingId: null,
};
const marcInstance = {
  title: `AT_C895648_MarcInstance_${getRandomPostfix()}`,
  uuid: null,
  collegeHoldingId: null,
  universityHoldingId: null,
};
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
  permissions.bulkEditQueryView.gui,
];

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: user.userId,
              permissions: userPermissions,
            });
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });

          HoldingsNoteTypesConsortiumManager.createViaApi(centralSharedHoldingNoteType)
            .then((newHoldingNoteType) => {
              centralSharedHoldingNoteTypeData = newHoldingNoteType;
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              InventoryInstances.createHoldingsNoteTypeViaApi(collegeHoldingNoteType.name).then(
                (noteTypeId) => {
                  collegeHoldingNoteType.id = noteTypeId;
                },
              );

              cy.setTenant(Affiliations.University);
              InventoryInstances.createHoldingsNoteTypeViaApi(universityHoldingNoteType.name).then(
                (noteTypeId) => {
                  universityHoldingNoteType.id = noteTypeId;
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;
              });

              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.getLocations({ limit: 1 })
                .then((res) => {
                  locationId = res.id;
                })
                .then(() => {
                  [folioInstance, marcInstance].forEach((instance) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instance.uuid,
                      permanentLocationId: locationId,
                      sourceId,
                    }).then((holding) => {
                      instance.collegeHoldingId = holding.id;
                    });
                    cy.wait(1000);
                  });
                });
              cy.setTenant(Affiliations.University);
              cy.getLocations({ limit: 1 })
                .then((res) => {
                  locationId = res.id;
                })
                .then(() => {
                  [folioInstance, marcInstance].forEach((instance) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instance.uuid,
                      permanentLocationId: locationId,
                      sourceId,
                    }).then((holding) => {
                      instance.universityHoldingId = holding.id;
                    });
                    cy.wait(1000);
                  });
                });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              cy.intercept('GET', '**/query/**').as('query');
              cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('preview');

              BulkEditSearchPane.openQuerySearch();
              BulkEditSearchPane.checkHoldingsRadio();
              BulkEditSearchPane.clickBuildQueryButton();
              QueryModal.verify();

              QueryModal.selectField(holdingsFieldValues.affiliationName);
              QueryModal.selectOperator(QUERY_OPERATIONS.IN);
              QueryModal.chooseFromValueMultiselect(tenantNames.college);
              QueryModal.chooseFromValueMultiselect(tenantNames.university);

              QueryModal.addNewRow();
              QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
              QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
              QueryModal.fillInValueTextfield(`${folioInstance.uuid}, ${marcInstance.uuid}`, 1);

              QueryModal.testQuery();
              QueryModal.waitForQueryCompleted('@query');
              QueryModal.verifyNumberOfMatchedRecords(4);

              QueryModal.clickRunQuery();
              QueryModal.verifyClosed();

              cy.wait('@preview', getLongDelay()).then(() => {
                BulkEditSearchPane.verifyBulkEditQueryPaneExists();
                BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('4 holdings');
              });
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        cy.setTenant(Affiliations.College);
        cy.deleteHoldingRecordViaApi(folioInstance.collegeHoldingId);
        cy.deleteHoldingRecordViaApi(marcInstance.collegeHoldingId);
        InventoryInstances.deleteHoldingsNoteTypeViaApi(collegeHoldingNoteType.id);

        cy.setTenant(Affiliations.University);
        cy.deleteHoldingRecordViaApi(folioInstance.universityHoldingId);
        cy.deleteHoldingRecordViaApi(marcInstance.universityHoldingId);
        InventoryInstances.deleteHoldingsNoteTypeViaApi(universityHoldingNoteType.id);

        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        HoldingsNoteTypesConsortiumManager.deleteViaApi(centralSharedHoldingNoteTypeData);
      });

      it(
        'C895648 In Central tenant options on Holdings bulk edit form correspond to the tenant(s) of matched records (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C895648'] },
        () => {
          // Step 1: Check "Member" column checkbox and verify both tenants are present
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
          );

          [
            { holdingId: folioInstance.collegeHoldingId, tenant: tenantNames.college },
            { holdingId: folioInstance.universityHoldingId, tenant: tenantNames.university },
            { holdingId: marcInstance.collegeHoldingId, tenant: tenantNames.college },
            { holdingId: marcInstance.universityHoldingId, tenant: tenantNames.university },
          ].forEach(({ holdingId, tenant }) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
              tenant,
            );
          });

          // Step 2: Click "Start bulk edit"
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 3: Verify Holdings note types options from both tenants are present
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            centralSharedHoldingNoteType.payload.name,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            collegeHoldingNoteTypeNameWithAffiliation,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            universityHoldingNoteTypeNameWithAffiliation,
          );

          // Step 4: Close bulk edit form
          BulkEditActions.closeBulkEditForm();
          BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('4 holdings');

          // Step 5: Build and run query for Holdings from member-1 (College) tenant only
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(holdingsFieldValues.affiliationName);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(tenantNames.college);

          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.fillInValueTextfield(`${folioInstance.uuid}, ${marcInstance.uuid}`, 1);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(2);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then(() => {
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 holdings');

            // Step 6: Click "Start bulk edit"
            BulkEditActions.openActions();
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();

            // Step 7: Verify Holdings note types options from member-1 (College) tenant only
            BulkEditActions.clickOptionsSelection();
            BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
              centralSharedHoldingNoteType.payload.name,
            );
            BulkEditActions.verifyOptionExistsInSelectOptionDropdown(collegeHoldingNoteType.name);
            BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
              universityHoldingNoteTypeNameWithAffiliation,
              false,
            );
            BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
              universityHoldingNoteType.name,
              false,
            );
          });
        },
      );
    });
  });
});
