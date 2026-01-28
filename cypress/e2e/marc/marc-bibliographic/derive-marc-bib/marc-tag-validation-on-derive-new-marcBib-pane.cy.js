import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag245RowIndex: 14,
        tagValues: ['', '0', '04', '04c', 'abc', '!!!', '   '],
        calloutTagMessage: 'Tag must contain three characters and can only accept numbers 0-9.',
      };

      const marcFile = {
        marc: 'marcBibFileForC543826.mrc',
        fileName: `testMarcFileC543826.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };

      let createdInstanceID;

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
            () => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdInstanceID = record[marcFile.propertyName].id;
                });
              });
            },
          );

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceID);
      });

      it(
        'C543826 MARC tag validation on "Derive a new MARC bib record" pane (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C543826'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceID);
          InventoryInstances.selectInstance();
          InventoryInstance.deriveNewMarcBib();

          testData.tagValues.forEach((tagValue) => {
            QuickMarcEditor.updateExistingTagValue(testData.tag245RowIndex, tagValue);
            QuickMarcEditor.verifyTagValue(testData.tag245RowIndex, tagValue);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessage(testData.tag245RowIndex, testData.calloutTagMessage);
            QuickMarcEditor.closeAllCallouts();
          });
        },
      );
    });
  });
});
