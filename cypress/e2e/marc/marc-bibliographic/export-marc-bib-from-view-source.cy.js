import { APPLICATION_NAMES } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C543799_MarcBibInstance_${randomPostfix}`,
      contributorValue: `AT_C543799_Contributor_${randomPostfix}`,
    };
    const exportedInstanceFileName = `AT_C543799_exportedMarcInstanceFile_${getRandomPostfix()}.mrc`;
    const marcInstanceFields = [
      {
        tag: '008',
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: '245',
        content: `$a ${testData.instanceTitle}`,
        indicators: ['1', '1'],
      },
      {
        tag: '700',
        content: `$a ${testData.contributorValue}`,
        indicators: ['\\', '\\'],
      },
    ];

    let createdInstanceId;
    let user;

    before(() => {
      cy.getAdminToken();
      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
        (instanceId) => {
          createdInstanceId = instanceId;
        },
      );
      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask('AT_C543799*');
      FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
      FileManager.deleteFile(`cypress/fixtures/${exportedInstanceFileName}`);
    });

    it(
      'C543799 Export "MARC bibliographic" record from "View source" pane in "Inventory" app (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C543799'] },
      () => {
        InventoryInstances.searchByTitle(createdInstanceId);
        InventoryInstances.selectInstanceById(createdInstanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.viewSource();

        InventoryViewSource.validateOptionsInActionsMenu();
        InventoryViewSource.exportInstanceMarc();

        cy.intercept('/data-export/quick-export').as('getJobHrid');
        cy.wait('@getJobHrid', getLongDelay()).then((resp) => {
          const expectedJobHrid = resp.response.body.jobExecutionHrId;

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          ExportFile.waitLandingPageOpened();
          ExportFile.downloadExportedMarcFileWithRecordHrid(
            expectedJobHrid,
            exportedInstanceFileName,
          );
          ExportFile.verifyFileIncludes(exportedInstanceFileName, [
            testData.instanceTitle,
            testData.contributorValue,
            createdInstanceId,
          ]);
        });
      },
    );
  });
});
