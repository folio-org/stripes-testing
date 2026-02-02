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
        tag022: '022',
        tag222: '222',
        tag300: '300',
        tag300Value: '$av.$b25 cm.',
      };

      const calloutTagMessage =
        'Tag must contain three characters and can only accept numbers 0-9.';

      const marcFile = {
        marc: 'marcBibForC375177.mrc',
        fileName: `testMarcFileC375177.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };

      const createdInstanceIDs = [];

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
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
                  createdInstanceIDs.push(record[marcFile.propertyName].id);
                });
              });
            },
          );
        });
      });

      beforeEach('Login', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdInstanceIDs.forEach((instanceID) => {
          InventoryInstance.deleteInstanceViaApi(instanceID);
        });
      });

      it(
        'C375177 Error notifications shown before confirmation modals when saving "MARC bib" record while deriving record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C375177'] },
        () => {
          // #1 Input query in search input filed which will return "Instance" record with source "MARC".
          InventoryInstances.searchByTitle(createdInstanceIDs[0]);
          // #2 Click on a row with the result of search from step 1.
          InventoryInstances.selectInstance();
          // #3 Click on the "Actions" button → select "Derive new MARC bibliographic record" option from the expanded menu.
          InventoryInstance.deriveNewMarcBib();

          // #4 Delete the last character from "LDR" field.
          QuickMarcEditor.fillEmptyTextFieldOfField(0, 'records[0].content.ELvl', '');
          // #5 Input "0" in tag box (first box) for any field.
          QuickMarcEditor.updateExistingTagName(testData.tag022, '0');

          // #6 Delete any un-edited field.
          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag222);

          // #7 Update any un-edited field with valid value.
          QuickMarcEditor.updateExistingField(testData.tag300, `${testData.tag300Value} test`);

          // #8 Click "Save & close" button.
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, calloutTagMessage);

          // #9 Input deleted value in "LDR" field.
          QuickMarcEditor.fillEmptyTextFieldOfField(0, 'records[0].content.ELvl', '\\');

          // #10 Click "Save & close" button.
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, calloutTagMessage);

          // #11 Input original tag value for field updated in Step 5.
          QuickMarcEditor.updateExistingTagName('0', testData.tag022);

          // #12 Click "Save & close" button.
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkDeleteModal(1);

          // #13 Click "Restore deleted field(s)" button in modal.
          QuickMarcEditor.clickRestoreDeletedField();
          QuickMarcEditor.checkDeleteModalClosed();
          QuickMarcEditor.checkFieldsExist([testData.tag222]);
        },
      );
    });
  });
});
