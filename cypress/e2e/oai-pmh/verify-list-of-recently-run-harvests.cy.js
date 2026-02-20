import { Permissions } from '../../support/dictionary';
import { Behavior, Logs, OaiPmh, Technical } from '../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../support/fragments/settings/oai-pmh/behavior';
import { SECTIONS } from '../../support/fragments/settings/oai-pmh/oaipmhPane';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import ResourceIdentifierTypes from '../../support/fragments/settings/inventory/instances/resourceIdentifierTypes';
import Formats from '../../support/fragments/settings/inventory/instances/formats';
import NatureOfContent from '../../support/fragments/settings/inventory/instances/natureOfContent';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import OaiPmhFragment from '../../support/fragments/oai-pmh/oaiPmh';
import getRandomPostfix from '../../support/utils/stringTools';
import FileManager from '../../support/utils/fileManager';

const testData = {
  user: {},
  resourceIdentifierType: {
    name: `AT_C398012_ResourceIdentifier_${getRandomPostfix()}`,
    source: 'local',
  },
  format: {
    name: `AT_C398012_Format_${getRandomPostfix()}`,
    code: `C398012_${getRandomPostfix()}`,
    source: 'local',
  },
  natureOfContent: {
    name: `AT_C398012_NatureOfContent_${getRandomPostfix()}`,
    source: 'local',
  },
  instance: {
    title: `AT_C398012_FolioInstance_${getRandomPostfix()}`,
  },
};

describe('OAI-PMH', () => {
  before('Create test data', () => {
    cy.createTempUser([Permissions.oaipmhSettingsEdit.gui, Permissions.oaipmhViewLogs.gui])
      .then((userProperties) => {
        testData.user = userProperties;
      })
      .then(() => {
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
          BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
          BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
        );
      })
      .then(() => {
        ResourceIdentifierTypes.createViaApi(testData.resourceIdentifierType).then((response) => {
          testData.resourceIdentifierType.id = response.body.id;
        });
        Formats.createViaApi(testData.format).then((response) => {
          testData.format.id = response.body.id;
        });
        NatureOfContent.createViaApi(testData.natureOfContent).then((response) => {
          testData.natureOfContent.id = response.body.id;
        });
      })
      .then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instance.title,
              identifiers: [
                {
                  value: `TEST-${getRandomPostfix()}`,
                  identifierTypeId: testData.resourceIdentifierType.id,
                },
                {
                  value: `ISBN-${getRandomPostfix()}`,
                  identifierTypeId: testData.resourceIdentifierType.id,
                },
              ],
              instanceFormatIds: [testData.format.id, testData.format.id],
              natureOfContentTermIds: [testData.natureOfContent.id, testData.natureOfContent.id],
            },
          }).then((createdInstanceData) => {
            testData.instance.id = createdInstanceData.instanceId;
          });
        });
      })
      .then(() => {
        ResourceIdentifierTypes.deleteViaApi(testData.resourceIdentifierType.id);
        Formats.deleteViaApi(testData.format.id);
        NatureOfContent.deleteViaApi(testData.natureOfContent.id);
      })
      .then(() => {
        OaiPmhFragment.listRecordsRequest('marc21').then((response) => {
          OaiPmhFragment.verifyOaiPmhRecordHeader(response, testData.instance.id);
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(testData.instance.id);
    Behavior.updateBehaviorConfigViaApi();
    Users.deleteViaApi(testData.user.userId);
    FileManager.deleteFileFromDownloadsByMask('*-error.csv');
  });

  it(
    'C398012 Verify list of recently run harvests OAI-PMH (firebird)',
    { tags: ['extendedPathFlaky', 'firebird', 'C398012', 'nonParallel'] },
    () => {
      // Step 1: Navigate to Settings > OAI-PMH > Logs
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.oaiPmhPath,
        waiter: OaiPmh.waitLoading,
      });

      // Step 2: Select "OAI-PMH"- option by clicking on it
      OaiPmh.checkSectionListItems({ canViewLogs: true });

      // Step 3: Select "Logs" element
      OaiPmh.selectSection(SECTIONS.LOGS);
      Logs.verifyLogsPane();
      Logs.verifyLogsTableColumns();

      //  Step 4-6: Download and verify error log file
      Logs.downloadErrorLog();

      const expectedErrors = [
        `Related identifier type is not found by the given id:  ${testData.resourceIdentifierType.id}`,
        `Instance format is not found by the given id: ${testData.format.id}`,
        `Nature of content term is not found by the given id: ${testData.natureOfContent.id}`,
      ];

      Logs.verifyErrorLogFileContent(expectedErrors, testData.instance.id);

      // Step 7-8: Verify Technical configuration
      OaiPmh.selectSection(SECTIONS.TECHNICAL);
      Technical.verifyCleanErrorsIntervalInConfig('30');
    },
  );
});
