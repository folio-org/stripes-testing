import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Instance', () => {
      const testData = {
        marcFilePath: 'oneMarcBib.mrc',
        marcFileName: `C651500 autotestFileName${getRandomPostfix()}.mrc`,
        jobProfileName: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          testData.marcFilePath,
          testData.marcFileName,
          testData.jobProfileName,
        ).then((response) => {
          testData.instanceId = response[0].instance.id;

          cy.createTempUser([]).then((userProperties) => {
            testData.user = userProperties;

            cy.assignCapabilitiesToExistingUser(
              testData.user.userId,
              [],
              [CapabilitySets.uiInventory],
            );

            cy.getUserToken(testData.user.username, testData.user.password);
            cy.getStatisticalCodes({
              limit: 1,
              query: 'code=="rmusic"',
            }).then((code) => {
              cy.getInstanceById(testData.instanceId).then((body) => {
                body.statisticalCodeIds = [code[0].id];

                cy.updateInstance(body);
              });
            });

            cy.login(testData.user.username, testData.user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(testData.instanceId);
            InventoryInstances.selectInstance();
            InstanceRecordView.verifyInstanceRecordViewOpened();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651500 Check "Version History" pane in the detail view of MARC Instance record (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651500'] },
        () => {
          InstanceRecordView.checkButtonsStateWhenVersionHistoryPaneClosed();
          InstanceRecordView.checkVersionHistoryButtonToolTipText();
          InstanceRecordView.clickVersionHistoryButton();
          InstanceRecordView.checkButtonsStateWhenVersionHistoryPaneIsOpen();
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Statistical codes (Added)'],
          });
          VersionHistorySection.openChangesForCard();
          VersionHistorySection.verifyChangesModal();
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.ADDED,
            'Statistical codes',
            'No value set-',
            'Music sound recordings',
          );
          VersionHistorySection.closeChangesModal();
          VersionHistorySection.clickCloseButton();
          InstanceRecordView.checkButtonsStateWhenVersionHistoryPaneClosed();
        },
      );
    });
  });
});
