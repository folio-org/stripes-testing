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
let instanceUuids;
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
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

function createInstance({ title, type = 'folio', statisticalCodeId }) {
  if (type === 'marc') {
    return cy.createSimpleMarcBibViaAPI(title).then((instanceId) => {
      return cy.getInstanceById(instanceId).then((instanceData) => {
        if (statisticalCodeId) {
          instanceData.statisticalCodeIds = [statisticalCodeId];
          return cy.updateInstance(instanceData).then(() => ({
            uuid: instanceId,
            hrid: instanceData.hrid,
          }));
        }
        return { uuid: instanceId, hrid: instanceData.hrid };
      });
    });
  } else {
    return InventoryInstances.createFolioInstanceViaApi({
      instance: {
        instanceTypeId,
        title,
        ...(statisticalCodeId && { statisticalCodeIds: [statisticalCodeId] }),
      },
    }).then((folioInstanceData) => {
      return cy.getInstanceById(folioInstanceData.instanceId).then((instanceData) => ({
        uuid: folioInstanceData.instanceId,
        hrid: instanceData.hrid,
      }));
    });
  }
}

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
              createInstance({ title: marcInstance.title, type: 'marc' }).then(({ uuid, hrid }) => {
                marcInstance.uuid = uuid;
                marcInstance.hrid = hrid;
              });
              createInstance({
                title: marcInstanceWithStatisticalCode.title,
                type: 'marc',
                statisticalCodeId: statisticalCode.id,
              }).then(({ uuid, hrid }) => {
                marcInstanceWithStatisticalCode.uuid = uuid;
                marcInstanceWithStatisticalCode.hrid = hrid;
              });
            })
            .then(() => {
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
                instanceTypeId = instanceTypes[0].id;

                createInstance({ title: folioInstance.title, type: 'folio' }).then(
                  ({ uuid, hrid }) => {
                    folioInstance.uuid = uuid;
                    folioInstance.hrid = hrid;
                  },
                );
                createInstance({
                  title: folioInstanceWithStatisticalCode.title,
                  type: 'folio',
                  statisticalCodeId: statisticalCode.id,
                }).then(({ uuid, hrid }) => {
                  folioInstanceWithStatisticalCode.uuid = uuid;
                  folioInstanceWithStatisticalCode.hrid = hrid;
                });
              });
            })
            .then(() => {
              instanceUuids = [
                marcInstance.uuid,
                marcInstanceWithStatisticalCode.uuid,
                folioInstance.uuid,
                folioInstanceWithStatisticalCode.uuid,
              ];
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                instanceUuids.join('\n'),
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

        instanceUuids.forEach((uuid) => {
          InventoryInstance.deleteInstanceViaApi(uuid);
        });

        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
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
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              statisticalCode.fullName,
            );
          });
          instancesWithoutStatisticalCode.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
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
          BulkEditActions.selectAction('Remove');
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

          parseMrcFileContentAndVerify(fileNames.previewMarc, recordsToVerify, 2);

          BulkEditActions.downloadPreview();

          marcInstances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewCSV,
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
          BulkEditSearchPane.clickShowWarningsCheckbox();
          BulkEditSearchPane.verifyError(marcInstance.uuid, warningMessage, 'Warning');
          BulkEditSearchPane.verifyError(folioInstance.uuid, errorMessage);
          BulkEditSearchPane.verifyError(folioInstanceWithStatisticalCode.uuid, errorMessage);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, [recordsToVerify[1]], 1);

          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWithStatisticalCode.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            '',
          );
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.changedRecordsCSV, 1);
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
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
