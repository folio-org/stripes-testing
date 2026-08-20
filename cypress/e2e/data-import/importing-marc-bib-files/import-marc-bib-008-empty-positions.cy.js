import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_008_FIELD_ILLS_DROPDOWN,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      marcFile: {
        marc: 'marcBibFileForC1332477.mrc',
        fileName: `testMarcFileC1332477.${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      },
      tag008: '008',
      tag245: '245',
      tag008InitialPattern: /^\s{6}m20172019nyua\s+6\s+000\s+1\s+eng\s+d/,
      tag008BoxValues: [
        {
          boxName: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
          expectedValue: INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          isDropdown: true,
          index: null,
        },
        {
          boxName: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
          expectedValue: '2017',
          isDropdown: false,
          index: null,
        },
        {
          boxName: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
          expectedValue: '2019',
          isDropdown: false,
          index: null,
        },
        {
          boxName: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
          expectedValue: 'nyu',
          isDropdown: false,
          index: null,
        },
        {
          boxName: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.ILLS,
          expectedValue: INVENTORY_008_FIELD_ILLS_DROPDOWN.A,
          isDropdown: true,
          index: 0,
        },
      ],
    };
    const updated245Value = `$a AT_C1332477_MarcBibInstance_${randomPostfix}`;

    let instanceId;
    let user;

    before('Create user and import test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        instanceId = response[0].instance.id;
      });

      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          user.userId,
          [],
          [
            CapabilitySets.uiDataImport,
            CapabilitySets.uiInventory,
            CapabilitySets.uiQuickMarcQuickMarcEditor,
          ],
        );

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1332477 Import MARC bib record with empty positions 00-05 of 008 MARC field (promin)',
      { tags: ['extendedPathECS', 'promin', 'C1332477'] },
      () => {
        const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();

        // Steps 1-4: File imported via API; navigate to instance in Inventory
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InstanceRecordView.waitLoading();

        // Step 5: Actions > View source — verify 008 has blanks in positions 00-05
        InstanceRecordView.viewSource();
        InventoryViewSource.waitLoading();
        InventoryViewSource.checkFieldContentMatch(testData.tag008, testData.tag008InitialPattern);
        InventoryViewSource.close();

        // Step 6: Actions > Edit MARC bib — verify 008 field box values
        InstanceRecordView.waitLoading();
        InstanceRecordView.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();
        testData.tag008BoxValues.forEach(({ boxName, expectedValue, isDropdown, index }) => {
          if (isDropdown) {
            QuickMarcEditor.verifyDropdownOptionChecked(
              testData.tag008,
              boxName,
              expectedValue,
              null,
              index,
            );
          } else QuickMarcEditor.verifyTextBoxValueInField(testData.tag008, boxName, expectedValue);
        });

        // Steps 7-8: Update 245 field and save
        QuickMarcEditor.updateExistingField(testData.tag245, updated245Value);
        QuickMarcEditor.pressSaveAndClose();
        InstanceRecordView.waitLoading();

        // Step 9: Actions > View source — verify 008 now has today's date in positions 00-05
        InstanceRecordView.viewSource();
        InventoryViewSource.waitLoading();
        InventoryViewSource.checkFieldContentMatch(
          testData.tag008,
          new RegExp(`^${todayDateYYMMDD}m20172019nyua\\s+6\\s+000\\s+1\\s+eng\\s+d`),
        );
        InventoryViewSource.close();

        // Step 10: Actions > Edit MARC bib — verify 008 box values still correct
        InstanceRecordView.waitLoading();
        InstanceRecordView.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();
        testData.tag008BoxValues.forEach(({ boxName, expectedValue, isDropdown, index }) => {
          if (isDropdown) {
            QuickMarcEditor.verifyDropdownOptionChecked(
              testData.tag008,
              boxName,
              expectedValue,
              null,
              index,
            );
          } else QuickMarcEditor.verifyTextBoxValueInField(testData.tag008, boxName, expectedValue);
        });
      },
    );
  });
});
