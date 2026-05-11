import { APPLICATION_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Instance', () => {
      const testData = {
        resourceTitle: `C651477 autotestInstanceTitle${getRandomPostfix()}`,
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
      };

      before('Create test data', () => {
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory],
          );

          cy.getUserToken(testData.user.username, testData.user.password);
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            testData.instance = instanceData;

            cy.getInstanceById(testData.instance.instanceId).then((body) => {
              body.title = testData.resourceTitle;
              cy.updateInstance(body);
            });

            cy.login(testData.user.username, testData.user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(testData.instance.instanceId);
            InventoryInstances.selectInstance();
            InstanceRecordView.verifyInstanceRecordViewOpened();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651477 Check "Version History" pane in the detail view of FOLIO Instance record (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651477'] },
        () => {
          const currentCardIndex = 0;
          const numberOfVersions = 2;

          InstanceRecordView.checkVersionHistoryButtonToolTipText();
          InstanceRecordView.clickVersionHistoryButton();
          InstanceRecordView.checkButtonsStateWhenVersionHistoryPaneIsOpen();
          VersionHistorySection.verifyVersionHistoryPane(numberOfVersions);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Title (Edited)'],
          });
          VersionHistorySection.openChangesForCard(currentCardIndex);
          VersionHistorySection.verifyChangesModal();
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            'Title',
            testData.instance.instanceTitle,
            testData.resourceTitle,
          );
          VersionHistorySection.closeChangesModal();
          VersionHistorySection.clickCloseButton();
          InstanceRecordView.checkButtonsStateWhenVersionHistoryPaneClosed();
        },
      );
    });
  });
});
