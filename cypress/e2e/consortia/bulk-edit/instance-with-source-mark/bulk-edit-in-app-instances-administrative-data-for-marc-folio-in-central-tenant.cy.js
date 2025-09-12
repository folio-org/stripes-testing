import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let statisticalCodeFirst;
let statisticalCodeSecond;
const marcInstance = {
  title: `AT_C651445_MarcInstance_${getRandomPostfix()}`,
};
const folioInstance = {
  title: `AT_C651445_FolioInstance_${getRandomPostfix()}`,
};
const errorMessage =
  'Instance with source FOLIO is not supported by MARC records bulk edit and cannot be updated.';
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName, true);
const previewFileNameMrc = BulkEditFiles.getPreviewMarcFileName(instanceUUIDsFileName, true);
const previewFileNameCsv = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName, true);
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
  describe('Instances with source MARC', () => {
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

          cy.getStatisticalCodes({ limit: 2 }).then((codes) => {
            cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
              codes.forEach((code) => {
                code.typeName = codeTypes.filter(
                  (item) => item.id === code.statisticalCodeTypeId,
                )[0].name;
                code.fullName = `${code.typeName}: ${code.code} - ${code.name}`;
              });

              [statisticalCodeFirst, statisticalCodeSecond] = codes;
            });

            cy.createSimpleMarcBibViaAPI(marcInstance.title)
              .then((instanceId) => {
                marcInstance.uuid = instanceId;

                cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                  marcInstance.hrid = instanceData.hrid;

                  instanceData.statisticalCodeIds = [statisticalCodeFirst.id];

                  cy.updateInstance(instanceData);
                });
              })
              .then(() => {
                cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
                  folioInstance.instanceTypeId = instanceTypes[0].id;

                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: folioInstance.instanceTypeId,
                      title: folioInstance.title,
                      statisticalCodeIds: [statisticalCodeFirst.id],
                    },
                  }).then((instanceData) => {
                    folioInstance.uuid = instanceData.instanceId;

                    cy.getInstanceById(instanceData.instanceId).then((folioInstanceData) => {
                      folioInstance.hrid = folioInstanceData.hrid;
                    });
                  });
                });
              })
              .then(() => {
                FileManager.createFile(
                  `cypress/fixtures/${instanceUUIDsFileName}`,
                  `${marcInstance.uuid}\n${folioInstance.uuid}`,
                );
              });
          });

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
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        [marcInstance.uuid, folioInstance.uuid].forEach((uuid) => {
          InventoryInstance.deleteInstanceViaApi(uuid);
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
        'C651445 ECS | Bulk edit administrative data for all records in Central tenant (MARC & FOLIO) (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C651445'] },
        () => {
          BulkEditActions.openActions();
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          const instanceUuids = [marcInstance.uuid, folioInstance.uuid];

          instanceUuids.forEach((uuid) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              statisticalCodeFirst.fullName,
            );
          });

          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
          BulkEditActions.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
          );
          BulkEditActions.selectSecondAction('Add');
          BulkEditActions.verifySecondActionSelected('Add');
          BulkEditActions.selectStatisticalCodeValue(statisticalCodeSecond.fullName);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            1,
          );
          BulkEditActions.selectSecondAction('Remove', 1);
          BulkEditActions.selectStatisticalCodeValue(statisticalCodeFirst.fullName, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(1, 1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            statisticalCodeSecond.fullName,
          );
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
          BulkEditActions.downloadPreviewInMarcFormat();

          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstance.uuid,
              assertions: [
                (record) => {
                  expect(record.fields[3]).to.deep.eq(['245', '  ', 'a', marcInstance.title]);
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
              ],
            },
          ];

          parseMrcFileContentAndVerify(previewFileNameMrc, assertionsOnMarcFileContent, 1);

          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            statisticalCodeSecond.fullName,
          );
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            statisticalCodeSecond.fullName,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          BulkEditSearchPane.verifyError(folioInstance.uuid, errorMessage);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(changedRecordsFileNameMrc, assertionsOnMarcFileContent, 1);

          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            statisticalCodeSecond.fullName,
          );
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `ERROR,${folioInstance.uuid},${errorMessage}`,
          ]);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
          InstanceRecordView.verifyStatisticalCodeTypeAndName(
            statisticalCodeSecond.typeName,
            statisticalCodeSecond.name,
          );
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyAbsenceOfValue(statisticalCodeFirst.typeName);
          InventoryViewSource.verifyAbsenceOfValue(statisticalCodeSecond.typeName);
          InventoryViewSource.close();
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyStatisticalCodeTypeAndName(
            statisticalCodeFirst.typeName,
            statisticalCodeFirst.name,
          );
        },
      );
    });
  });
});
