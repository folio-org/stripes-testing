import {
  DEFAULT_JOB_PROFILE_NAMES,
  RECORD_STATUSES,
  APPLICATION_NAMES,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import MarcFieldProtection from '../../../../support/fragments/settings/dataImport/marcFieldProtection';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        tags: {
          tag260: '260',
          tag520: '520',
          tag655: '655',
          tag755: '755',
        },
      };
      const protectedFields = [
        {
          protectedField: '245',
          in1: '*',
          in2: '*',
          subfield: 'a',
          data: '*',
          source: 'User',
        },
        {
          protectedField: '260',
          in1: '1',
          in2: '1',
          subfield: 'a',
          data: '*',
          source: 'User',
        },
        {
          protectedField: '520',
          in1: '*',
          in2: '*',
          subfield: '*',
          data: '*',
          source: 'User',
        },
        {
          protectedField: '655',
          in1: '1',
          in2: '*',
          subfield: 'b',
          data: 'Added row',
          source: 'User',
        },
        {
          protectedField: '755',
          in1: '*',
          in2: '*',
          subfield: 'a',
          data: '*',
          source: 'User',
        },
      ];

      const marcFile = {
        marc: 'marcBibFileForC353526.mrc',
        fileName: `testMarcFileC353526.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      let instanceIds;

      before('Create test data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            instanceIds = record[marcFile.propertyName].id;
          });
        });
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
            authRefresh: true,
          });
        });
        Logs.waitFileIsImported(marcFile.fileName);
        Logs.checkJobStatus(marcFile.fileName, 'Completed');
        Logs.openFileDetails(marcFile.fileName);
        Logs.goToTitleLink(RECORD_STATUSES.CREATED);
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(instanceIds);
        const fieldCodes = protectedFields.map(({ protectedField }) => protectedField);
        MarcFieldProtection.deleteProtectedFieldsViaApi(fieldCodes);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C353526 Protection of specified fields when editing "MARC Bibliographic" record (spitfire) (TaaS)',
        { tags: ['criticalPathFlaky', 'spitfire', 'C353526', 'nonParallel'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          MarcAuthority.checkInfoButton('999');
          MarcAuthority.addNewField(5, testData.tags.tag260, '$a London', '1', '1');
          MarcAuthority.addNewField(6, testData.tags.tag520, '$a Added row');
          MarcAuthority.addNewField(7, testData.tags.tag655, '$b Added row', '1', '\\');
          MarcAuthority.addNewField(8, testData.tags.tag655, '$b Different row', '1', '\\');
          MarcAuthority.addNewField(9, testData.tags.tag655, '$b Row without indicator', '1', '\\');
          MarcAuthority.addNewField(10, testData.tags.tag755, '$b Different row', '1', '\\');
          cy.wait(2000);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndClose();

          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MARC_FIELD_PROTECTION);
          MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
          protectedFields.forEach((field) => {
            MarcFieldProtection.clickNewButton();
            MarcFieldProtection.fillMarcFieldProtection(field);
            MarcFieldProtection.save();
            cy.wait(1000);
            MarcFieldProtection.verifyFieldProtectionIsCreated(field.protectedField);
          });
          cy.go('back');
          cy.go('back');
          cy.go('back');

          InventoryInstance.editMarcBibliographicRecord();
          MarcAuthority.checkInfoButton('001');
          MarcAuthority.checkInfoButton('999');
          MarcAuthority.checkInfoButton('245');
          MarcAuthority.checkInfoButton('260');
          MarcAuthority.checkInfoButton('520', 7);
          MarcAuthority.checkInfoButton('655', 8);
          MarcAuthority.updateDataByRowIndex(6, 'Updated protected row content');
          MarcAuthority.updateDataByRowIndex(7, 'Updated protected row content');
          MarcAuthority.updateDataByRowIndex(8, 'Updated protected row content');
          MarcAuthority.updateDataByRowIndex(30, 'Updated protected row content');
          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('245\t', 'Updated protected row content');
          InventoryViewSource.verifyFieldInMARCBibSource('260\t', 'Updated protected row content');
          InventoryViewSource.verifyFieldInMARCBibSource('520\t', 'Updated protected row content');
          InventoryViewSource.verifyFieldInMARCBibSource('655\t', 'Updated protected row content');
        },
      );
    });
  });
});
