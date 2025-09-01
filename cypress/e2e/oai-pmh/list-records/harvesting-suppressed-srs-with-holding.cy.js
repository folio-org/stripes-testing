import {
  DEFAULT_JOB_PROFILE_NAMES,
  LOCATION_NAMES,
  INSTITUTION_NAMES,
  CAMPUS_NAMES,
  LIBRARY_NAMES,
  CALL_NUMBER_TYPE_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';

let user;
const marcInstance = {};
const marcBibFile = {
  marc: 'marcBibFileForC375966.mrc',
  fileNameImported: `testMarcBibFileC375970.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const marcHoldingsFile = {
  marc: 'marcHoldingForC375966.mrc',
  fileNameImported: `testMarcHoldingsFileC375966.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC375966.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
};

describe('OAI-PMH ListRecords', () => {
  before('Create test data and configure behavior', () => {
    cy.getAdminToken();
    Behavior.updateBehaviorConfigViaApi(
      true,
      'Source record storage and Inventory',
      'persistent',
      '200',
    );

    DataImport.uploadFileViaApi(...Object.values(marcBibFile)).then((resp) => {
      marcInstance.id = resp[0].instance.id;

      cy.getInstanceById(marcInstance.id)
        .then((instanceData) => {
          marcInstance.hrid = instanceData.hrid;

          DataImport.editMarcFile(
            marcHoldingsFile.marc,
            marcHoldingsFile.editedFileName,
            ['oo10000000000'],
            [marcInstance.hrid],
          );
        })
        .then(() => {
          DataImport.uploadFileViaApi(
            marcHoldingsFile.editedFileName,
            marcHoldingsFile.fileNameImported,
            marcHoldingsFile.jobProfileToRun,
          ).then((response) => {
            marcInstance.holdingsId = response[0].holding.id;
          });
        });
    });

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      Permissions.moduleDataImportEnabled.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
    FileManager.deleteFile(`cypress/fixtures/${marcHoldingsFile.editedFileName}`);
  });

  it(
    'C375966 ListRecords: Verify harvesting suppressed SRS with holdings -- Transfer flag (firebird)',
    { tags: ['criticalPath', 'firebird', 'C375966'] },
    () => {
      // Step 1-3: Search for the instance by title
      InventorySearchAndFilter.searchInstanceByTitle(marcInstance.id);
      InventoryInstances.selectInstance();
      InventoryInstance.waitLoading();
      InstanceRecordView.edit();
      InstanceRecordEdit.waitLoading();
      InstanceRecordEdit.clickDiscoverySuppressCheckbox();
      InstanceRecordEdit.saveAndClose();
      InstanceRecordView.waitLoading();
      InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();

      // Step 4: Send the "GET" request
      cy.getAdminToken();
      OaiPmh.listRecordsRequest('marc21_withholdings').then((response) => {
        const marcFieldsToVerify = [
          {
            field: '856',
            indicators: { ind1: '4', ind2: '0' },
            subfields: {
              t: '1',
              u: 'Resource_URI',
              y: 'Link text',
              3: 'Materials specified',
              z: 'Public note',
            },
          },
          {
            field: '856',
            indicators: { ind1: '4', ind2: '1' },
            subfields: {
              t: '1',
              u: 'Version_of_resource_URI',
              y: 'Link text',
              3: 'Materials specified',
              z: 'Public note',
            },
          },
          {
            field: '856',
            indicators: { ind1: '4', ind2: '2' },
            subfields: {
              t: '1',
              u: 'Related_resource_URI',
              y: 'Link text',
              3: 'Materials specified',
              z: 'Public note',
            },
          },

          {
            field: '856',
            indicators: { ind1: '4', ind2: ' ' },
            subfields: {
              t: '1',
              u: 'empty_value_URI',
              y: 'Link text',
              3: 'Materials specified',
              z: 'Public note',
            },
          },
          {
            field: '952',
            indicators: { ind1: 'f', ind2: 'f' },
            subfields: {
              t: '1',
              a: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
              b: CAMPUS_NAMES.CITY_CAMPUS,
              c: LIBRARY_NAMES.DATALOGISK_INSTITUT,
              d: LOCATION_NAMES.MAIN_LIBRARY_UI,
              e: 'Holdings call number',
              f: 'Holdings call number prefix',
              g: 'Holdings call number suffix',
              h: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
            },
          },
          {
            field: '999',
            indicators: { ind1: 'f', ind2: 'f' },
            subfields: { t: '1', i: marcInstance.id },
          },
        ];

        marcFieldsToVerify.forEach((verification) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            verification.field,
            verification.indicators,
            verification.subfields,
          );
        });
      });
    },
  );
});
