import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../../../support/fragments/inventory/holdingsRecordView';
import QueryModal, {
  QUERY_OPERATIONS,
  holdingsFieldValues,
} from '../../../../../support/fragments/bulk-edit/query-modal';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../../support/constants';
import { getLongDelay } from '../../../../../support/utils/cypressTools';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let sourceId;
let locationInCollegeData;
const callNumberPrefix = `000000${randomFourDigitNumber()}`;
const folioInstance = {
  title: `C496114 folio instance testBulkEdit_${getRandomPostfix()}`,
  holdingId: null,
  holdingHrid: null,
};
const marcInstance = {
  title: `C496114 marc instance testBulkEdit_${getRandomPostfix()}`,
  holdingId: null,
  holdingHrid: null,
};
const instances = [folioInstance, marcInstance];
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
            permissions.bulkEditQueryView.gui,
          ]);
          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // create shared folio instance
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.id = createdInstanceData.instanceId;
              });
            })
            .then(() => {
              // create shared marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.id = instanceId;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              // create holdings in College tenant
              InventoryInstances.getLocations({ limit: 1 }).then((resp) => {
                locationInCollegeData = resp[0];

                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: locationInCollegeData.id,
                    temporaryLocationId: locationInCollegeData.id,
                    callNumberPrefix,
                    sourceId,
                  }).then((holding) => {
                    instance.holdingId = holding.id;
                    instance.holdingHrid = holding.hrid;
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
              BulkEditSearchPane.openQuerySearch();
              BulkEditSearchPane.checkHoldingsRadio();
              BulkEditSearchPane.clickBuildQueryButton();
              QueryModal.verify();
              QueryModal.selectField(holdingsFieldValues.permanentLocation);
              QueryModal.verifySelectedField(holdingsFieldValues.permanentLocation);
              QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
              QueryModal.chooseValueSelect(locationInCollegeData.name);
              QueryModal.addNewRow();
              QueryModal.selectField(holdingsFieldValues.callNumberPrefix, 1);
              QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
              QueryModal.fillInValueTextfield(callNumberPrefix, 1);
              cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
              cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
              QueryModal.clickTestQuery();
              QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        instances.forEach((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdingId);
        });

        cy.resetTenant();
        cy.getAdminToken();

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });

        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
        );
      });

      it(
        'C496114 Verify "Clear" action for Holdings location in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C496114'] },
        () => {
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileName = `*-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileName = `*-Changed-Records-CSV-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 holdings');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(permanent_location.name == ${locationInCollegeData.name}) AND (holdings.call_number_prefix == ${callNumberPrefix})`,
            );

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.holdingHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                instance.holdingHrid,
              );
            });

            const initialHeaderValues = [
              {
                header:
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
                value: locationInCollegeData.name,
              },
              {
                header:
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
                value: locationInCollegeData.name,
              },
            ];

            BulkEditActions.downloadMatchedResults();

            instances.forEach((instance) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                instance.holdingHrid,
                initialHeaderValues,
              );
            });

            BulkEditActions.openInAppStartBulkEditFrom();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditActions.verifyConfirmButtonDisabled(true);
            BulkEditActions.clearTemporaryLocation('holdings');
            BulkEditActions.verifyTheActionOptions(['Clear field', 'Replace with']);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

            const editedHeaderValues = [
              {
                header:
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
                value: '',
              },
              {
                header:
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
                value: locationInCollegeData.name,
              },
            ];

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
                instance.holdingHrid,
                editedHeaderValues,
              );
            });

            BulkEditActions.verifyAreYouSureForm(2);
            BulkEditActions.downloadPreview();

            instances.forEach((instance) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                instance.holdingHrid,
                editedHeaderValues,
              );
            });

            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(2);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
                instance.holdingHrid,
                editedHeaderValues,
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            instances.forEach((instance) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                instance.holdingHrid,
                editedHeaderValues,
              );
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();

            instances.forEach((instance) => {
              InventorySearchAndFilter.searchInstanceByTitle(instance.title);
              InventorySearchAndFilter.selectViewHoldings();
              HoldingsRecordView.waitLoading();
              HoldingsRecordView.checkPermanentLocation(locationInCollegeData.name);
              HoldingsRecordView.checkTemporaryLocation('-');
              HoldingsRecordView.close();
              InventorySearchAndFilter.resetAll();
            });
          });
        },
      );
    });
  });
});
