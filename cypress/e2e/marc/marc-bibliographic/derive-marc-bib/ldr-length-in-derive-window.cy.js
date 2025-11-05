import DataImport from '../../../../support/fragments/data_import/dataImport';
import permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      let userId;
      let instanceID;
      const elvlBoxNewValue = '';
      const marcFile = {
        marc: 'marcBibFileForC353612.mrc',
        fileName: `testMarcFileC353612${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };

      before(() => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            instanceID = record[marcFile.propertyName].id;
          });
        });

        cy.createTempUser([
          permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });

          InventoryInstances.searchByTitle(instanceID);
          InventoryInstances.selectInstance();
          InventoryInstance.waitInventoryLoading();
        });
      });

      after(() => {
        cy.getAdminToken();
        Users.deleteViaApi(userId);
        InventoryInstance.deleteInstanceViaApi(instanceID);
      });

      it(
        'C353612 Verify "LDR" length in Derive window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C353612'] },
        () => {
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.fillInElvlBoxInLDRField(elvlBoxNewValue);
          QuickMarcEditor.verifyValueInElvlBoxInLDRField(elvlBoxNewValue);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyAfterDerivedMarcBibSave();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyLDRPositionsDefaultValues('records[0].content.ELvl', 'u', false);
        },
      );
    });
  });
});
