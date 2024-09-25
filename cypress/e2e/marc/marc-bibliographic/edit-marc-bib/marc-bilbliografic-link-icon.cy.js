import { DEFAULT_JOB_PROFILE_NAMES, RECORD_STATUSES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {};
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
      const propertyName = 'instance';
      const tagArray = [
        '100',
        '110',
        '111',
        '130',
        '240',
        '600',
        '610',
        '611',
        '630',
        '650',
        '651',
        '655',
        '700',
        '710',
        '711',
        '730',
        '800',
        '810',
        '811',
        '830',
      ];
      let createdInstanceID;
      let fileName;

      beforeEach(() => {
        fileName = `C360541testMarcFile.${getRandomPostfix()}.mrc`;
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.settingsDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
          DataImport.uploadFileViaApi('marcFileForC360542.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdInstanceID = record[propertyName].id;
              });
            },
          );
          Logs.waitFileIsImported(fileName);
          Logs.checkJobStatus(fileName, 'Completed');
          Logs.openFileDetails(fileName);
          Logs.goToTitleLink(RECORD_STATUSES.CREATED);
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        if (createdInstanceID) InventoryInstance.deleteInstanceViaApi(createdInstanceID);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C360541 Verify that "Link to MARC Authority record" icon displays next to MARC fields when editing Bib record (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          tagArray.forEach((tag) => {
            QuickMarcEditor.checkLinkButtonExist(tag);
          });
          QuickMarcEditor.checkLinkButtonToolTipText('Link to MARC Authority record');
        },
      );

      it(
        'C360542 Verify that "Link to MARC Authority record" icon displays next to MARC fields when deriving Bib record (spitfire)',
        { tags: ['smoke', 'spitfire', 'shiftLeftBroken'] },
        () => {
          InventoryInstance.deriveNewMarcBib();
          tagArray.forEach((tag) => {
            QuickMarcEditor.checkLinkButtonExist(tag);
          });
        },
      );
    });
  });
});
