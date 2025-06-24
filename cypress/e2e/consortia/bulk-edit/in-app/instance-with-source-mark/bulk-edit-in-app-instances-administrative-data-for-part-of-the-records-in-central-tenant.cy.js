import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../../support/constants';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify from '../../../../../support/utils/parseMrcFileContent';

let user;
let instanceTypeId;
let statisticalCode;
const marcInstance = {
  title: `C663252_MarcInstance_${getRandomPostfix()}`,
};
const marcInstanceWithStatisticalCode = {
  title: `C663252_MarcInstance_${getRandomPostfix()}`,
};
const folioInstance = {
  title: `C663252_FolioInstance_${getRandomPostfix()}`,
};
const folioInstanceWithStatisticalCode = {
  title: `C663252_FolioInstance_${getRandomPostfix()}`,
};
const warningMessage = 'No change in administrative data required';
const errorMessage =
  'Instance with source FOLIO is not supported by MARC records bulk edit and cannot be updated.';
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const previewFileNameMrc = BulkEditFiles.getPreviewMarcFileName(instanceUUIDsFileName, true);
const previewFileNameCsv = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName, true);
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsMarcFileName(
  instanceUUIDsFileName,
  true,
);
const changedRecordsFileNameMrc = BulkEditFiles.getChangedRecordsMarcFileName(
  instanceUUIDsFileName,
  true,
);
const changedRecordsFileNameCsv = BulkEditFiles.getChangedRecordsFileName(
  instanceUUIDsFileName,
  true,
);
const errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
  instanceUUIDsFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getStatisticalCodes({ limit: 1 })
            .then((code) => {
              statisticalCode = code[0];
              cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
                statisticalCode.typeName = codeTypes.filter(
                  (item) => item.id === statisticalCode.statisticalCodeTypeId,
                )[0].name;
                statisticalCode.fullName = `${statisticalCode.typeName}: ${statisticalCode.code} - ${statisticalCode.name}`;
              });
            })
            .then(() => {
              // create marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;

                cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                  marcInstance.hrid = instanceData.hrid;
                });
              });
              // create marc instance with statistical code
              cy.createSimpleMarcBibViaAPI(marcInstanceWithStatisticalCode.title).then(
                (instanceId) => {
                  marcInstanceWithStatisticalCode.uuid = instanceId;

                  cy.getInstanceById(marcInstanceWithStatisticalCode.uuid).then((instanceData) => {
                    marcInstanceWithStatisticalCode.hrid = instanceData.hrid;

                    instanceData.statisticalCodeIds = [statisticalCode.id];

                    cy.updateInstance(instanceData);
                  });
                },
              );
            })
            .then(() => {
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
                instanceTypeId = instanceTypes[0].id;

                // create FOLIO instance
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                  },
                }).then((folioInstanceData) => {
                  folioInstance.uuid = folioInstanceData.instanceId;

                  cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                    folioInstance.hrid = instanceData.hrid;
                  });
                });
                // create FOLIO instance with statistical code
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstanceWithStatisticalCode.title,
                    statisticalCodeIds: [statisticalCode.id],
                  },
                }).then((folioInstanceData) => {
                  folioInstanceWithStatisticalCode.uuid = folioInstanceData.instanceId;

                  cy.getInstanceById(folioInstanceWithStatisticalCode.uuid).then((instanceData) => {
                    folioInstanceWithStatisticalCode.hrid = instanceData.hrid;
                  });
                });
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${marcInstance.uuid}\n${marcInstanceWithStatisticalCode.uuid}\n${folioInstance.uuid}\n${folioInstanceWithStatisticalCode.uuid}`,
              );
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('4 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        [
          marcInstance,
          marcInstanceWithStatisticalCode,
          folioInstance,
          folioInstanceWithStatisticalCode,
        ].forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          previewFileNameMrc,
          previewFileNameCsv,
          changedRecordsFileNameMrc,
          changedRecordsFileNameCsv,
          matchedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C663252 ECS | Bulk edit administrative data for part of the records in Central tenant (MARC & FOLIO) (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C663252'] },
        () => {
          BulkEditActions.openActions();
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          const instancesWithStatisticalCode = [
            marcInstanceWithStatisticalCode,
            folioInstanceWithStatisticalCode,
          ];
          const instancesWithoutStatisticalCode = [marcInstance, folioInstance];

          instancesWithStatisticalCode.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              statisticalCode.fullName,
            );
          });
          instancesWithoutStatisticalCode.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              '',
            );
          });

          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
          BulkEditActions.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
          );
          BulkEditActions.selectSecondAction('Remove');
          BulkEditActions.selectStatisticalCodeValue(statisticalCode.fullName);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(2, 2);

          const marcInstances = [marcInstance, marcInstanceWithStatisticalCode];

          marcInstances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              '',
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);
          BulkEditActions.downloadPreviewInMarcFormat();

          const commonAssertions = (instance) => [
            (record) => expect(record.get('001')).to.not.be.empty,
            (record) => expect(record.get('005')[0].value).to.match(/^\d{14}\.\d{1}$/),
            (record) => expect(record.get('008')).to.not.be.empty,
            (record) => expect(record.fields[2]).to.include('008'),
            (record) => expect(record.fields[3]).to.deep.eq(['245', '  ', 'a', instance.title]),
            (record) => expect(record.fields[4]).to.include(instance.uuid),
            (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
            (record) => expect(record.get('999')[0].subf[0][1]).to.eq(instance.uuid),
          ];
          const recordsToVerify = marcInstances.map((instance) => ({
            uuid: instance.uuid,
            assertions: commonAssertions(instance),
          }));

          parseMrcFileContentAndVerify(previewFileNameMrc, recordsToVerify, 2);

          BulkEditActions.downloadPreview();

          marcInstances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileNameCsv,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              '',
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstanceWithStatisticalCode.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            '',
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          // BulkEditSearchPane.clickShowWarningsCheckbox();
          BulkEditSearchPane.verifyError(marcInstance.uuid, warningMessage, 'Warning');
          BulkEditSearchPane.verifyError(folioInstance.uuid, errorMessage);
          BulkEditSearchPane.verifyError(folioInstanceWithStatisticalCode.uuid, errorMessage);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(changedRecordsFileName, [recordsToVerify[1]], 1);

          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWithStatisticalCode.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            '',
          );
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(changedRecordsFileNameCsv, 1);
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `ERROR,${folioInstance.uuid},${errorMessage}`,
            `ERROR,${folioInstanceWithStatisticalCode.uuid},${errorMessage}`,
            `WARNING,${marcInstance.uuid},${warningMessage}`,
          ]);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWithStatisticalCode.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
          InstanceRecordView.verifyStatisticalCodeTypeAndName('No value set-', 'No value set-');
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyExistanceOfValueInRow(
            `$a ${marcInstanceWithStatisticalCode.title}`,
            4,
          );
          InventoryViewSource.verifyExistanceOfValueInRow(
            `$i ${marcInstanceWithStatisticalCode.uuid}`,
            5,
          );
          InventoryViewSource.close();
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.searchInstanceByTitle(folioInstanceWithStatisticalCode.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyStatisticalCodeTypeAndName(
            statisticalCode.typeName,
            statisticalCode.name,
          );
        },
      );
    });
  });
});
