import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../support/fragments/topMenu';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';
import DataImport from '../../../support/fragments/data_import/dataImport';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', () => {
      const testData = {
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        tag245: '245',
        valid245IndicatorValue: '1',
        instanceTitle: `AT_C692069_MarcBibInstance_${getRandomPostfix()}`,
        marcFile: {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFileC692069.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };
      const permissions = [
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      ];

      const createdRecordIDs = [];

      before('Creating data', () => {
        cy.createTempUser(permissions).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[testData.marcFile.propertyName].id);
            });

            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });

            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBib();
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle}`);
            QuickMarcEditor.updateIndicatorValue(
              testData.tag245,
              testData.valid245IndicatorValue,
              0,
            );
            QuickMarcEditor.updateIndicatorValue(
              testData.tag245,
              testData.valid245IndicatorValue,
              1,
            );
            QuickMarcEditor.pressSaveAndClose();
            InventoryInstance.waitLoading();

            cy.url().then((url) => {
              const derivedRecordId = url.split('/')[5].split('?')[0];
              createdRecordIDs.push(derivedRecordId);
              testData.derivedInstanceId = derivedRecordId;
            });
          });
        });
      });

      beforeEach('Login', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdRecordIDs.forEach((instanceId) => {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        });
        InventoryInstance.deleteInstanceViaApi(testData.derivedInstanceId);
      });

      it(
        'C692069 "Version history" pane is displayed on "View source" pane of "MARC bibliographic" record derived via "quickmarc" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C692069'] },
        () => {
          InventoryInstances.searchByTitle(testData.derivedInstanceId);
          InventoryInstances.selectInstance();

          InventoryInstance.viewSource();
          InventoryViewSource.verifyVersionHistoryButtonShown();

          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(1, false);

          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.firstName,
            testData.lastName,
            true,
          );

          VersionHistorySection.verifyVersionsCount(1);
          VersionHistorySection.clickCloseButton();
          InventoryViewSource.waitLoading();
          InventoryViewSource.checkActionsButtonEnabled(true);
        },
      );
    });
  });
});
