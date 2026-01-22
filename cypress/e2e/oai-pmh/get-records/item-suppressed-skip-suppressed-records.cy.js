import {
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
} from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';

let user;
const marcInstance = {};
const marcBibFile = {
  marc: 'marcBibFileForC375193.mrc',
  fileNameImported: `testMarcBibFileC375193.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const marcHoldingsFile = {
  marc: 'oneMarcHolding.mrc',
  fileNameImported: `testMarcHoldingsFileC375193.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC375193${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
};
const itemData = {
  barcode: `barcode_${getRandomPostfix()}`,
  uri: 'http://item-test.com',
  relationshipType: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createTempUser([Permissions.inventoryAll.gui])
        .then((userProperties) => {
          user = userProperties;

          DataImport.uploadFileViaApi(...Object.values(marcBibFile)).then((response) => {
            marcInstance.id = response[0].instance.id;

            cy.getInstanceById(marcInstance.id).then((instance) => {
              marcInstance.title = instance.title;
              marcInstance.hrid = instance.hrid;

              DataImport.editMarcFile(
                marcHoldingsFile.marc,
                marcHoldingsFile.editedFileName,
                ['oo10000000000'],
                [marcInstance.hrid],
              );
            });
          });
        })
        .then(() => {
          DataImport.uploadFileViaApi(
            marcHoldingsFile.editedFileName,
            marcHoldingsFile.fileNameImported,
            marcHoldingsFile.jobProfileToRun,
          ).then((response) => {
            marcInstance.holdingsId = response[0].holding.id;

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventorySearchAndFilter.waitLoading,
            });
          });
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Behavior.updateBehaviorConfigViaApi();
      FileManager.deleteFile(`cypress/fixtures/${marcHoldingsFile.editedFileName}`);
    });

    it(
      'C375193 GetRecord: Verify Item (SRS) suppressed from discovery in case Skip suppressed from discovery records (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375193', 'nonParallel'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.id);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.addItem();

        ItemRecordNew.markAsSuppressedFromDiscovery();

        ItemRecordNew.fillItemRecordFields({
          barcode: itemData.barcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });
        ItemRecordNew.addElectronicAccessFields({
          uri: itemData.uri,
          relationshipType: itemData.relationshipType,
        });
        ItemRecordNew.saveAndClose();
        InventoryInstance.waitLoading();

        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: marcInstance.id },
          );
          OaiPmh.verifyMarcFieldAbsent(response, marcInstance.id, '856', { ind1: '4', ind2: '0' });
        });
      },
    );
  });
});
