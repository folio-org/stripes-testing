import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      tag852: '852',
      errorMessage: 'Record cannot be saved. Can only have one MARC 852.',
    };
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFileC350721.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    let user;
    let instanceID;

    before(() => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

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

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceID);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C350721 Cannot create MARC Holdings record with multiple "852" fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C350721'] },
      () => {
        InventoryInstances.searchByTitle(instanceID);
        InventoryInstances.selectInstance();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.waitLoading();

        QuickMarcEditor.updateExistingField(testData.tag852, QuickMarcEditor.getExistingLocation());

        QuickMarcEditor.addEmptyFields(4);
        QuickMarcEditor.addValuesToExistingField(
          4,
          testData.tag852,
          QuickMarcEditor.getExistingLocation(),
        );

        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkErrorMessage(5, testData.errorMessage);
        QuickMarcEditor.checkErrorMessage(6, testData.errorMessage);
      },
    );
  });
});
