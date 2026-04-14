import permissions from '../../../support/dictionary/permissions';
import { Behavior, OaiPmh as OaiPmhPane } from '../../../support/fragments/settings/oai-pmh';
import {
  BEHAVIOR_SETTINGS_OPTIONS_UI,
  BEHAVIOR_SETTINGS_OPTIONS_API,
} from '../../../support/fragments/settings/oai-pmh/behavior';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import { SECTIONS } from '../../../support/fragments/settings/oai-pmh/oaipmhPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

let folioInstanceId;
let user;
const folioInstance = {
  title: `AT_C376977_FolioInstance_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.inventoryAll.gui, permissions.oaipmhSettingsEdit.gui]).then(
        (userProperties) => {
          user = userProperties;
        },
      );
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: folioInstance.title,
          },
        }).then((createdInstanceData) => {
          folioInstanceId = createdInstanceData.instanceId;
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(folioInstanceId);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C376977 GetRecord: Verify that added FOLIO instances are retrieved in response (oai_dc) (firebird)',
      { tags: ['extendedPath', 'firebird', 'nonParallel', 'C376977'] },
      () => {
        OaiPmh.getRecordRequest(folioInstanceId, 'oai_dc').then((response) => {
          OaiPmh.verifyDublinCoreField(response, folioInstanceId, {
            title: folioInstance.title,
            rights: 'discovery not suppressed',
          });
          OaiPmh.verifyOaiPmhRecordHeader(response, folioInstanceId, false, true);
        });

        cy.login(user.username, user.password, {
          path: SettingsMenu.oaiPmhPath,
          waiter: OaiPmhPane.waitLoading,
        });
        OaiPmhPane.selectSection(SECTIONS.BEHAVIOR);

        Behavior.pickSuppressedRecordsProcessing(
          BEHAVIOR_SETTINGS_OPTIONS_UI.SUPPRESSED_RECORDS_PROCESSING.SKIP,
        );
        Behavior.clickSave();
        InteractorsTools.checkCalloutMessage('Setting was successfully updated.');

        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstanceId, 'oai_dc').then((response) => {
          OaiPmh.verifyDublinCoreField(
            response,
            folioInstanceId,
            {
              title: folioInstance.title,
            },
            ['rights'],
          );
          OaiPmh.verifyOaiPmhRecordHeader(response, folioInstanceId, false, true);
        });
      },
    );
  });
});
