import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {};
    const onlyContentField = {
      rowIndex: 5,
      tag: '',
      content: '$a',
    };

    const emptyField = {
      rowIndex: 6,
      tag: '',
      content: '',
    };

    const EmptyIndicatorsField = {
      rowIndex: 7,
      tag: '',
      content: '$a',
      indicator0: '',
      indicator1: '',
    };

    const indicatorsOnlyField = {
      rowIndex: 8,
      tag: '',
      content: '',
      indicator0: '1',
      indicator1: '2',
    };

    const marcFile = {
      marc: 'marcBibFileForC434155.mrc',
      fileName: `testMarcFileC434155.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const holdingsIDs = [];
    let instanceID;

    before(() => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            instanceID = record[marcFile.propertyName].id;
          });
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      holdingsIDs.forEach((id) => {
        cy.deleteHoldingRecordViaApi(id);
      });
      InventoryInstance.deleteInstanceViaApi(instanceID);
    });

    it(
      'C434155 "Are you sure?" modal is displayed after user pressed "ESC" button when record has unsaved changes - Create a new MARC Holdings record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C434155'] },
      () => {
        InventoryInstances.searchByTitle(instanceID);
        InventoryInstances.selectInstance();
        InventoryInstance.goToMarcHoldingRecordAdding();
        MarcAuthority.addNewField(
          onlyContentField.rowIndex,
          onlyContentField.tag,
          onlyContentField.content,
        );
        MarcAuthority.addNewField(emptyField.rowIndex, emptyField.tag, emptyField.content);
        MarcAuthority.addNewField(
          EmptyIndicatorsField.rowIndex,
          EmptyIndicatorsField.tag,
          EmptyIndicatorsField.content,
          EmptyIndicatorsField.indicator0,
          EmptyIndicatorsField.indicator1,
        );
        MarcAuthority.addNewField(
          indicatorsOnlyField.rowIndex,
          indicatorsOnlyField.tag,
          indicatorsOnlyField.content,
          indicatorsOnlyField.indicator0,
          indicatorsOnlyField.indicator1,
        );
        QuickMarcEditor.verifySaveAndCloseButtonEnabled();
        QuickMarcEditor.discardChangesWithEscapeKey(5);
        QuickMarcEditor.cancelEditConfirmationPresented();
      },
    );
  });
});
