import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: 'King Kong (1933)',
        originalField130: {
          tag: '130',
          content: '1  $a King Kong (1933)',
        },
        updatedField100: {
          tag: '100',
          content: '1  $a King Kong (1933)',
        },
        updatedField245: {
          tag: '245',
          content:
            '$a King Kong (1933) $h [electronic resource] : $b shooting script / $e script story by Merian C. Cooper and Edgar Wallace ; screenplay by Ruth Rose and James Ashmore Creelman.',
        },
      };
      const changesModalData = [
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '100',
          from: undefined,
          to: '1  $a King Kong (1933)',
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: '245',
          from: '10 $a King Kong (1933) $h [electronic resource] : $b shooting script / $c script story by Merian C. Cooper and Edgar Wallace ; screenplay by Ruth Rose and James Ashmore Creelman.',
          to: '10 $a King Kong (1933) $h [electronic resource] : $b shooting script / $e script story by Merian C. Cooper and Edgar Wallace ; screenplay by Ruth Rose and James Ashmore Creelman.',
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '130',
          from: '1  $a King Kong (1933)',
          to: undefined,
        },
      ];
      const permissions = [
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ];
      const marcFile = {
        marc: 'marcBibFileC692101.mrc',
        fileName: `testMarcFileC692101_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C692101');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            testData.createdRecordId = response[0].instance.id;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(testData.createdRecordId);
            InventoryInstances.selectInstanceById(testData.createdRecordId);
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C692101 Check "Version history" pane after Update of MARC tag and subfield\'s indicator in "MARC bibliographic" record via "quickmarc" (spitfire)',
        { tags: ['Extended', 'spitfire', 'C692101'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingTagName(
            testData.originalField130.tag,
            testData.updatedField100.tag,
          );

          QuickMarcEditor.updateExistingField(
            testData.updatedField245.tag,
            testData.updatedField245.content,
          );

          QuickMarcEditor.pressSaveAndCloseButton();
          InventoryInstance.waitLoading();

          InventoryInstance.viewSource();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();

          VersionHistorySection.verifyVersionHistoryPane(2, false);

          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
            false,
            true,
          );

          VersionHistorySection.checkChangeForCard(
            0,
            'Field 100',
            VersionHistorySection.fieldActions.ADDED,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field 245',
            VersionHistorySection.fieldActions.EDITED,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field 130',
            VersionHistorySection.fieldActions.REMOVED,
          );

          VersionHistorySection.checkChangesCountForCard(0, 3);
          VersionHistorySection.openChangesForCard(0);

          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );

          changesModalData.forEach((change) => {
            VersionHistorySection.checkChangeInModal(...Object.values(change));
          });

          VersionHistorySection.closeChangesModal();
        },
      );
    });
  });
});
