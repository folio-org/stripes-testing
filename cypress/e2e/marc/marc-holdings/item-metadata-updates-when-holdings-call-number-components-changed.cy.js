import uuid from 'uuid';
import { JOB_STATUS_NAMES, LOCATION_NAMES, RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('marc', () => {
  describe('MARC Holdings', () => {
    const testData = {
      createdRecordIDs: [],
      itemBarcode: uuid(),
      createdItemData: {},
      updatedItemData: {},
      tag852: '852',
      content852WithUpdatedCallNumber:
        '$b KU/CC/DI/A $h BR140TEST $i .J86 $x dbe=c $z Current issues in Periodicals Room $x CHECK-IN RECORD CREATED $k AB $m XY',
      updatedCallNumber: 'BR140TEST .J86',
      content852WithUpdatedPrefix:
        '$b KU/CC/DI/A $h BR140 $i .J86 $x dbe=c $z Current issues in Periodicals Room $x CHECK-IN RECORD CREATED $k ABTEST $m XY',
      updatedPrefix: 'ABTEST',
      content852WithUpdatedSuffix:
        '$b KU/CC/DI/A $h BR140 $i .J86 $x dbe=c $z Current issues in Periodicals Room $x CHECK-IN RECORD CREATED $k AB $m XYTEST',
      updatedSuffix: 'XYTEST',
    };
    const marcFiles = [
      {
        marc: 'oneMarcBib.mrc',
        fileName: `testMarcFileC388510${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      },
      {
        marc: 'marcBibFileForC388511.mrc',
        editedFileName: `testMarcFileC388510${getRandomPostfix()}.mrc`,
        fileName: `testMarcFileC388510${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create Holdings and SRS MARC Holdings',
      },
    ];

    before('create test data and login', () => {
      cy.getAdminToken().then(() => {
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
      });
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      // upload a marc file for creating new instance
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(marcFiles[0].marc, marcFiles[0].fileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(marcFiles[0].jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFiles[0].fileName);
      Logs.openFileDetails(marcFiles[0].fileName);
      FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        testData.instanceHrid = initialInstanceHrId;

        // edit marc file adding instance hrid
        DataImport.editMarcFile(
          marcFiles[1].marc,
          marcFiles[1].editedFileName,
          ['in00000000037'],
          [initialInstanceHrId],
        );
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFiles[1].editedFileName, marcFiles[1].fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFiles[1].jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFiles[1].fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFiles[1].fileName);
        Logs.getCreatedItemsID().then((link) => {
          testData.createdRecordIDs.push(link.split('/')[5]);

          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${testData.createdRecordIDs[0]}"`,
          }).then((holdings) => {
            testData.holdingsId = holdings[0].id;
          });
        });
      });
      cy.logout();

      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        ItemRecordNew.createViaApi({
          holdingsId: testData.holdingsId,
          itemBarcode: testData.itemBarcode,
          materialTypeId: testData.materialTypeId,
          permanentLoanTypeId: testData.loanTypeId,
        }).then((res) => {
          testData.createdItemData = res;
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      });
      FileManager.deleteFile(`cypress/fixtures/${marcFiles[1].editedFileName}`);
    });

    it(
      'C388510 Item metadata updates when Holdings call number components changed (MARC record) (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        InventoryInstance.openHoldingView();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.updateExistingField(
          testData.tag852,
          testData.content852WithUpdatedCallNumber,
        );
        QuickMarcEditor.pressSaveAndClose();
        HoldingsRecordView.getRecordLastUpdatedDate().then((date) => {
          const holdingsUpdateDate = date;

          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ANNEX_UI} >`);
          InventoryInstance.openItemByBarcode(testData.itemBarcode);
          cy.getItems({ query: `"barcode"=="${testData.itemBarcode}"` }).then((item) => {
            const updatedItemData = item;

            ItemRecordView.waitLoading();
            ItemRecordView.verifyItemMetadata(
              holdingsUpdateDate,
              updatedItemData.metadata,
              testData.user.userId,
            );
            ItemRecordView.verifyItemCallNumberChangedAfterChangedInHoldings(
              testData.createdItemData,
              updatedItemData,
              testData.updatedCallNumber,
            );
          });
          ItemRecordView.verifyLastUpdatedDate(holdingsUpdateDate, testData.user.username);
        });
        ItemRecordView.closeDetailView();
        InstanceRecordView.verifyInstanceRecordViewOpened();

        InventoryInstance.openHoldingView();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.updateExistingField(testData.tag852, testData.content852WithUpdatedPrefix);
        QuickMarcEditor.pressSaveAndClose();
        HoldingsRecordView.getRecordLastUpdatedDate().then((date) => {
          const holdingsUpdateDate = date;

          HoldingsRecordView.close();
          InventoryInstance.openItemByBarcode(testData.itemBarcode);
          cy.getItems({ query: `"barcode"=="${testData.itemBarcode}"` }).then((item) => {
            const updatedItemData = item;

            ItemRecordView.waitLoading();
            ItemRecordView.verifyItemMetadata(
              holdingsUpdateDate,
              updatedItemData.metadata,
              testData.user.userId,
            );
            ItemRecordView.verifyItemPrefixChangedAfterChangedInHoldings(
              testData.createdItemData,
              updatedItemData,
              testData.updatedPrefix,
            );
          });
          ItemRecordView.verifyLastUpdatedDate(holdingsUpdateDate, testData.user.username);
        });
        ItemRecordView.closeDetailView();
        InstanceRecordView.verifyInstanceRecordViewOpened();

        InventoryInstance.openHoldingView();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.updateExistingField(testData.tag852, testData.content852WithUpdatedSuffix);
        QuickMarcEditor.pressSaveAndClose();
        HoldingsRecordView.getRecordLastUpdatedDate().then((date) => {
          const holdingsUpdateDate = date;

          HoldingsRecordView.close();
          InventoryInstance.openItemByBarcode(testData.itemBarcode);
          cy.getItems({ query: `"barcode"=="${testData.itemBarcode}"` }).then((item) => {
            const updatedItemData = item;

            ItemRecordView.waitLoading();
            ItemRecordView.verifyItemMetadata(
              holdingsUpdateDate,
              updatedItemData.metadata,
              testData.user.userId,
            );
            ItemRecordView.verifyItemSuffixChangedAfterChangedInHoldings(
              testData.createdItemData,
              updatedItemData,
              testData.updatedSuffix,
            );
          });
          ItemRecordView.verifyLastUpdatedDate(holdingsUpdateDate, testData.user.username);
        });
      },
    );
  });
});
