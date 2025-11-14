import {
  DEFAULT_JOB_PROFILE_NAMES,
  RECORD_STATUSES,
  JOB_STATUS_NAMES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

describe('Data Import', () => {
  describe('Importing MARC Holdings files', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C345389_MarcBibInstance_${randomPostfix}`;
    const holdingsFileName = 'marcFileForC345389.mrc';
    const editedMarcFileName = `AT_C345389_MarcHoldingsFile${randomPostfix}.mrc`;
    const dateEnt = '241203';
    let user;
    let instanceHrid;
    let instanceUuid;

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createSimpleMarcBibViaAPI(instanceTitle).then((instanceId) => {
          instanceUuid = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            instanceHrid = instanceData.hrid;

            cy.login(user.username, user.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
              authRefresh: true,
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
    });

    it(
      'C345389 Import a MARC Holdings record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C345389'] },
      () => {
        DataImport.editMarcFile(
          holdingsFileName,
          editedMarcFileName,
          ['hrid_placeholder1'],
          [instanceHrid],
        );

        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedMarcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(instanceUuid);
        InventoryInstance.waitLoading();

        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        cy.intercept('/records-editor/records?*').as('getHoldingsRecord');
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        cy.wait('@getHoldingsRecord').then((res) => {
          const field008 = res.response.body.fields.find((field) => field.tag === '008');
          expect(field008.content['Date Ent']).to.be.eq(dateEnt);
        });
      },
    );
  });
});
