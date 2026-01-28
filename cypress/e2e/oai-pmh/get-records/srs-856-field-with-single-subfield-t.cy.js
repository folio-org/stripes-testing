import {
  DEFAULT_JOB_PROFILE_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const marcInstance = { title: `AT_C380604_MarcInstance_${getRandomPostfix()}` };
const marcHoldingsFile = {
  marc: 'marcHoldingsForC380604.mrc',
  fileNameImported: `testMarcHoldingsFileC380604.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC380604.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
};

// Electronic access types corresponding to 856 indicators
const electronicAccessTypes = {
  noDisplayConstant: {
    // ind1=4, ind2=8
    // actual indicators for imported marc instances "No display" - ind1=4, ind2=blank(\) (MODDATAIMP-804)
    type: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_DISPLAY_CONSTANT_GENERATED,
    indicators: { ind1: '4', ind2: ' ' },
  },
  noInformation: {
    // ind1=4, ind2=blank(\)
    type: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED,
    indicators: { ind1: '4', ind2: ' ' },
  },
  relatedResource: {
    // ind1=4, ind2=2
    type: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
    indicators: { ind1: '4', ind2: '2' },
  },
  resource: {
    // ind1=4, ind2=0
    type: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
    indicators: { ind1: '4', ind2: '0' },
  },
  versionOfResource: {
    // ind1=4, ind2=1
    type: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
    indicators: { ind1: '4', ind2: '1' },
  },
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;
      });

      // Create MARC instance without electronic access
      cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
        marcInstance.id = instanceId;

        cy.getInstanceById(marcInstance.id).then((instanceData) => {
          marcInstance.hrid = instanceData.hrid;

          // Import 5 MARC Holdings with different electronic access types
          DataImport.editMarcFile(
            marcHoldingsFile.marc,
            marcHoldingsFile.editedFileName,
            ['in00000000001', 'in00000000002', 'in00000000003', 'in00000000004', 'in00000000005'],
            new Array(5).fill(marcInstance.hrid),
          );
        });
      });

      DataImport.uploadFileViaApi(
        marcHoldingsFile.editedFileName,
        marcHoldingsFile.fileNameImported,
        marcHoldingsFile.jobProfileToRun,
      ).then((response) => {
        response.forEach((record, index) => {
          marcInstance[`holdingsId${index + 1}`] = record.holding.id;
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${marcHoldingsFile.editedFileName}`);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C380604 GetRecord: SRS - Verify the response contains 856 field with one subfield "t" for the holdings and item records with electronic access populated (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C380604', 'nonParallel'] },
      () => {
        // Step 1: Instance UUID is already available in marcInstance.id
        // Steps 2-3: Send GetRecord request and verify 856 fields for 5 holdings
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // Verify each unique indicator combination with appropriate count
          // ind1=4, ind2=' ' appears 2 times (noDisplayConstant + noInformation)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: ' ' },
            new Array(2).fill({ t: '0' }),
            2,
          );
          // ind1=4, ind2='2' appears 1 time (relatedResource)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '2' },
            [{ t: '0' }],
            1,
          );
          // ind1=4, ind2='0' appears 1 time (resource)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '0' },
            [{ t: '0' }],
            1,
          );
          // ind1=4, ind2='1' appears 1 time (versionOfResource)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '1' },
            [{ t: '0' }],
            1,
          );
        });

        // Steps 4: Add item with 5 electronic access types to 2 holdings
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.clickAddItemByHoldingId({
          holdingId: marcInstance.holdingsId1,
          instanceTitle: marcInstance.title,
        });

        // Step 5-11: Add item to first holdings with all 5 electronic access types
        ItemRecordNew.fillItemRecordFields({
          barcode: `barcode1_${getRandomPostfix()}`,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });

        Object.values(electronicAccessTypes).forEach((accessType, index) => {
          ItemRecordNew.addElectronicAccessFields({
            relationshipType: accessType.type,
            uri: `http://item${index + 1}.com`,
            rowNumber: index + 1,
          });
        });

        ItemRecordNew.saveAndClose({ itemSaved: true });
        InventoryInstance.waitLoading();

        // Step 12: Add item to second holdings with all 5 electronic access types
        InventoryInstance.clickAddItemByHoldingId({
          holdingId: marcInstance.holdingsId2,
          instanceTitle: marcInstance.title,
        });
        ItemRecordNew.fillItemRecordFields({
          barcode: `barcode2_${getRandomPostfix()}`,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });

        Object.values(electronicAccessTypes).forEach((accessType, index) => {
          ItemRecordNew.addElectronicAccessFields({
            relationshipType: accessType.type,
            uri: `http://item${index + 6}.com`,
            rowNumber: index + 1,
          });
        });

        ItemRecordNew.saveAndClose({ itemSaved: true });
        InventoryInstance.waitLoading();

        // Steps 13-14: Verify 856 fields still have single t="0" after adding items
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // Verify each unique indicator combination has single t="0" with exact count
          // ind1=4, ind2=' ': 2 holdings (noDisplayConstant + noInformation) + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: ' ' },
            new Array(4).fill({ t: '0' }),
            4,
          );
          // ind1=4, ind2='8': 2 items (noDisplayConstant)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '8' },
            new Array(2).fill({ t: '0' }),
            2,
          );
          // ind1=4, ind2='2': 1 holding (relatedResource) + 2 items (1 per item)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '2' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='0': 1 holding (resource) + 2 items (1 per item) = 3 total
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '0' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='1': 1 holding (versionOfResource) + 2 items (1 per item) = 3 total
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '1' },
            new Array(3).fill({ t: '0' }),
            3,
          );
        });

        // Steps 15-17: Add instance 856 field with ind1=4, ind2=8
        cy.getUserToken(user.username, user.password);
        InstanceRecordView.editMarcBibliographicRecord();
        QuickMarcEditor.updateLDR06And07Positions();
        QuickMarcEditor.addNewField('856', '$a Instance electronic access $u instance.com', 5);
        QuickMarcEditor.addValuesToExistingField(
          5,
          '856',
          '$a Instance electronic access $u instance.com',
          '4',
          '8',
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 18-19: Verify 856 fields have single t="0"
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: ' ' },
            new Array(4).fill({ t: '0' }),
            4,
          );
          // ind1=4, ind2='8'
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '8' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='2': 1 holding (relatedResource) + 2 items (1 per item)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '2' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='0': 1 holding (resource) + 2 items (1 per item) = 3 total
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '0' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='1': 1 holding (versionOfResource) + 2 items (1 per item) = 3 total
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '1' },
            new Array(3).fill({ t: '0' }),
            3,
          );
        });

        // Step 20: Edit instance 856 ind2 to blank(\)
        cy.getUserToken(user.username, user.password);
        InstanceRecordView.editMarcBibliographicRecord();
        QuickMarcEditor.updateIndicatorValue('856', '\\', 1);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 21: Verify all 856 fields after editing instance 856 to ind2=blank
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // ind1=4, ind2=' ': 2 holdings + 2 items + 1 instance = 5 total
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: ' ' },
            new Array(5).fill({ t: '0' }),
            5,
          );
          // ind1=4, ind2='8': 2 items (noDisplayConstant)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '8' },
            new Array(2).fill({ t: '0' }),
            2,
          );
          // ind1=4, ind2='2': 1 holding + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '2' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='0': 1 holding + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '0' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='1': 1 holding + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '1' },
            new Array(3).fill({ t: '0' }),
            3,
          );
        });

        // Step 22: Edit instance 856 ind2 to 2
        cy.getUserToken(user.username, user.password);
        InstanceRecordView.editMarcBibliographicRecord();
        QuickMarcEditor.updateIndicatorValue('856', '2', 1);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 23: Verify all 856 fields after editing instance 856 to ind2=2
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // ind1=4, ind2=' ': 2 holdings + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: ' ' },
            new Array(4).fill({ t: '0' }),
            4,
          );
          // ind1=4, ind2='8': 2 items (noDisplayConstant)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '8' },
            new Array(2).fill({ t: '0' }),
            2,
          );
          // ind1=4, ind2='2': 1 holding + 2 items + 1 instance = 4 total
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '2' },
            new Array(4).fill({ t: '0' }),
            4,
          );
          // ind1=4, ind2='0': 1 holding + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '0' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='1': 1 holding + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '1' },
            new Array(3).fill({ t: '0' }),
            3,
          );
        });

        // Step 24: Edit instance 856 ind2 to 0
        cy.getUserToken(user.username, user.password);
        InstanceRecordView.editMarcBibliographicRecord();
        QuickMarcEditor.updateIndicatorValue('856', '0', 1);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 25: Verify all 856 fields after editing instance 856 to ind2=0
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // ind1=4, ind2=' ': 2 holdings + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: ' ' },
            new Array(4).fill({ t: '0' }),
            4,
          );
          // ind1=4, ind2='8': 2 items (noDisplayConstant)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '8' },
            new Array(2).fill({ t: '0' }),
            2,
          );
          // ind1=4, ind2='2': 1 holding + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '2' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='0': 1 holding + 2 items + 1 instance = 4 total
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '0' },
            new Array(4).fill({ t: '0' }),
            4,
          );
          // ind1=4, ind2='1': 1 holding + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '1' },
            new Array(3).fill({ t: '0' }),
            3,
          );
        });

        // Step 26: Edit instance 856 ind2 to 1
        cy.getUserToken(user.username, user.password);
        InstanceRecordView.editMarcBibliographicRecord();
        QuickMarcEditor.updateIndicatorValue('856', '1', 1);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 27: Verify all 856 fields after editing instance 856 to ind2=1
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // ind1=4, ind2=' ': 2 holdings + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: ' ' },
            new Array(4).fill({ t: '0' }),
            4,
          );
          // ind1=4, ind2='8': 2 items (noDisplayConstant)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '8' },
            new Array(2).fill({ t: '0' }),
            2,
          );
          // ind1=4, ind2='2': 1 holding + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '2' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='0': 1 holding + 2 items
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '0' },
            new Array(3).fill({ t: '0' }),
            3,
          );
          // ind1=4, ind2='1': 1 holding + 2 items + 1 instance = 4 total
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '1' },
            new Array(4).fill({ t: '0' }),
            4,
          );
        });
      },
    );
  });
});
