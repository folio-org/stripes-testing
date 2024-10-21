import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import QickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
// import QueryModal, {
//   QUERY_OPERATIONS,
//   instanceFieldValues,
// } from '../../../../support/fragments/bulk-edit/query-modal';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let holdingTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
let previewFileName;
let changedRecordsFileName;
let downloadedFileNameForUpload;
const staffSuppressOption = 'Staff suppress';
const actions = {
  setTrue: 'Set true',
  setFalse: 'Set false',
};
const folioInstance = {
  title: `C496144 folio instance testBulkEdit_${getRandomPostfix()}`,
  itemBarcode1: `folioItem_available${getRandomPostfix()}`,
  itemBarcode2: `folioItem_checkedOut${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C496144 marc instance testBulkEdit_${getRandomPostfix()}`,
  itemBarcode1: `Item_available${getRandomPostfix()}`,
  itemBarcode2: `Item_checkedOut${getRandomPostfix()}`,
};
const leader = QickMarcEditor.defaultValidLdr;
const getMarcBibFields = (intsanceTitle) => {
  return [
    {
      tag: '008',
      content: QickMarcEditor.defaultValid008Values,
    },
    {
      tag: '245',
      content: `$a ${intsanceTitle}`,
      indicators: ['1', '1'],
    },
  ];
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteInstanceByTitleViaApi('C496144*');

        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
          permissions.bulkEditQueryView.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
            permissions.bulkEditQueryView.gui,
          ]);

          cy.resetTenant();

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // folio instance with items
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
                holdings: [
                  {
                    holdingsTypeId: holdingTypeId,
                    permanentLocationId: locationId,
                  },
                ],
                items: [
                  {
                    barcode: folioInstance.itemBarcode1,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypeId },
                  },
                  {
                    barcode: folioInstance.itemBarcode2,
                    status: { name: ITEM_STATUS_NAMES.CHECKED_OUT },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypeId },
                  },
                ],
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;

                cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                  folioInstance.hrid = instanceData.hrid;
                });

                cy.createMarcBibliographicViaAPI(leader, getMarcBibFields(marcInstance.title)).then(
                  (instanceId) => {
                    marcInstance.uuid = instanceId;

                    cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                      marcInstance.hrid = instanceData.hrid;

                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId,
                        permanentLocationId: locationId,
                        sourceId,
                      }).then((holdingData) => {
                        cy.createItem({
                          holdingsRecordId: holdingData.id,
                          materialType: { id: materialTypeId },
                          permanentLoanType: { id: loanTypeId },
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          barcode: marcInstance.itemBarcode1,
                        });
                        cy.createItem({
                          holdingsRecordId: holdingData.id,
                          materialType: { id: materialTypeId },
                          permanentLoanType: { id: loanTypeId },
                          status: { name: ITEM_STATUS_NAMES.CHECKED_OUT },
                          barcode: marcInstance.itemBarcode2,
                        });
                      });
                    });

                    cy.login(user.username, user.password, {
                      path: TopMenu.bulkEditPath,
                      waiter: BulkEditSearchPane.waitLoading,
                    });
                    ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

                    // stopped here

                    // BulkEditSearchPane.openQuerySearch();
                    // BulkEditSearchPane.checkInstanceRadio();
                    // BulkEditSearchPane.clickBuildQueryButton();
                    // QueryModal.verify();
                    // QueryModal.selectField(instanceFieldValues.staffSuppress);
                    // QueryModal.verifySelectedField(instanceFieldValues.staffSuppress);
                    // QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
                    // QueryModal.chooseValueSelect('False');
                    // QueryModal.addNewRow();
                    // QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
                    // QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
                    // QueryModal.fillInValueTextfield('C477642', 1);
                    // cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as(
                    //   'getPreview',
                    // );
                    // QueryModal.clickTestQuery();
                  },
                );
              });
            });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/downloaded-${identifiersQueryFilename}`);
        FileManager.deleteFileFromDownloadsByMask(
          identifiersQueryFilename,
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C496144 Verify "Replace with" action for Items status in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C496144'] },
        () => {
          // QueryModal.clickRunQuery();
          // QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileName = `*-Updates-Preview-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileName = `*-Changed-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane(2);
            BulkEditSearchPane.verifyQueryHeadLine(
              '(instance.staff_suppress == "false") AND (instance.title starts with "C477642")',
            );

            const instances = [folioInstance, marcInstance];

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
                instance.title,
              );
            });

            BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
            BulkEditSearchPane.verifyNextPaginationButtonDisabled();
            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            );
            BulkEditSearchPane.verifyResultColumnTitles(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            );

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                'false',
              );
            });

            BulkEditActions.downloadMatchedResults();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                'false',
              );
            });

            BulkEditActions.openStartBulkEditInstanceForm();
            BulkEditSearchPane.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditSearchPane.isConfirmButtonDisabled(true);
            BulkEditActions.selectOption(staffSuppressOption);
            BulkEditSearchPane.verifyInputLabel(staffSuppressOption);
            BulkEditActions.selectSecondAction(actions.setTrue);
            BulkEditActions.verifySecondActionSelected(actions.setTrue);
            BulkEditActions.verifyCheckboxAbsent();
            BulkEditSearchPane.isConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                'true',
              );
            });

            BulkEditActions.verifyAreYouSureForm(2);
            BulkEditActions.downloadPreview();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                'true',
              );
            });

            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(2);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                'true',
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                'true',
              );
            });

            instances.forEach((instance) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.selectYesfilterStaffSuppress();
              InventorySearchAndFilter.searchInstanceByTitle(instance.title);
              InventoryInstances.selectInstance();
              InventoryInstance.waitLoading();
              InventoryInstance.verifyStaffSuppress();
            });

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogsPane();
            BulkEditLogs.checkInstancesCheckbox();
            BulkEditLogs.verifyCheckboxIsSelected('INSTANCE', true);
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.downloadQueryIdentifiers();
            ExportFile.verifyFileIncludes(identifiersQueryFilename, [
              folioInstance.uuid,
              marcInstance.uuid,
            ]);
            BulkEditSearchPane.openIdentifierSearch();
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
              'Instances',
              'Instance UUIDs',
            );
            BulkEditSearchPane.uploadRecentlyDownloadedFile(identifiersQueryFilename).then(
              (changedFileName) => {
                downloadedFileNameForUpload = changedFileName;
                previewFileName = `*-Updates-Preview-${downloadedFileNameForUpload}`;
                changedRecordsFileName = `*-Changed-Records-${downloadedFileNameForUpload}`;

                instances.forEach((instance) => {
                  BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                    instance.hrid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
                    instance.title,
                  );
                });

                BulkEditActions.openActions();
                BulkEditActions.openStartBulkEditInstanceForm();
                BulkEditActions.selectOption(staffSuppressOption);
                BulkEditSearchPane.verifyInputLabel(staffSuppressOption);
                BulkEditActions.selectSecondAction(actions.setFalse);
                BulkEditActions.verifySecondActionSelected(actions.setFalse);
                BulkEditActions.verifyCheckboxAbsent();
                BulkEditSearchPane.isConfirmButtonDisabled(false);
                BulkEditActions.confirmChanges();
                BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

                instances.forEach((instance) => {
                  BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                    instance.hrid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                    'false',
                  );
                });

                BulkEditActions.verifyAreYouSureForm(2);
                BulkEditSearchPane.verifyPreviousPaginationButtonInAreYouSureFormDisabled();
                BulkEditSearchPane.verifyNextPaginationButtonInAreYouSureFormDisabled();
                BulkEditActions.downloadPreview();

                instances.forEach((instance) => {
                  BulkEditFiles.verifyValueInRowByUUID(
                    previewFileName,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                    instance.uuid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                    'false',
                  );
                });

                BulkEditActions.commitChanges();
                BulkEditActions.verifySuccessBanner(2);

                instances.forEach((instance) => {
                  BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                    instance.hrid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                    'false',
                  );
                });

                BulkEditActions.openActions();
                BulkEditActions.downloadChangedCSV();

                instances.forEach((instance) => {
                  BulkEditFiles.verifyValueInRowByUUID(
                    changedRecordsFileName,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                    instance.uuid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                    'false',
                  );
                });

                instances.forEach((instance) => {
                  TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
                  InventorySearchAndFilter.searchInstanceByTitle(instance.title);
                  InventoryInstances.selectInstance();
                  InventoryInstance.waitLoading();
                  InventoryInstance.verifyNoStaffSuppress();
                });
              },
            );
          });
        },
      );
    });
  });
});
