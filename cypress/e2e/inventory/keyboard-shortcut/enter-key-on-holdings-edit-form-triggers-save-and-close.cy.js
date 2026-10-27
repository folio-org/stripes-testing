import CapabilitySets from '../../../support/dictionary/capabilitySets';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C1464227_FolioInstance_${randomPostfix}`,
      copyNumber: `AT_C1464227_CopyNumber_${randomPostfix}`,
      callNumberValue: `AT_C1464227_CallNumber_${randomPostfix}`,
      acquisitionMethodValue: `AT_C1464227_AcqMethod_${randomPostfix}`,
      digitizationPolicyValue: `AT_C1464227_DigPolicy_${randomPostfix}`,
    };

    let user;
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          testData.locationId = location.id;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
          holdings: [{ permanentLocationId: testData.locationId }],
        }).then(({ instanceId: createdInstanceId }) => {
          instanceId = createdInstanceId;
        });

        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;
          cy.assignCapabilitiesToExistingUser(user.userId, [], [CapabilitySets.uiInventory]);

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C1464227 Enter key in textbox on holdings edit form triggers "Save & close" (promin)',
      { tags: ['extendedPath', 'promin', 'C1464227'] },
      () => {
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();

        // Step 1: Actions > Edit opens the holdings edit form
        HoldingsRecordView.edit();

        // Step 2: type into a non-resizable textbox (Copy number), press Enter - holdings
        // record saves, but (unlike the item/instance edit forms) the edit form stays open
        HoldingsRecordEdit.fillCallNumberValues({ copyNumber: testData.copyNumber });
        HoldingsRecordEdit.verifyCallNumberValues({ copyNumber: testData.copyNumber });
        HoldingsRecordEdit.pressEnterInCopyNumberField();
        HoldingsRecordEdit.verifyHoldingSavedCallout();
        InteractorsTools.closeAllVisibleCallouts();
        cy.wait(2000); // make sure the pane remains opened
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.verifyCallNumberValues({ copyNumber: testData.copyNumber });

        // Step 3 (representative, not every textbox): a resizable textbox (Call number)
        // doesn't save on Enter, form stays open - same still-open form, no need to reopen
        HoldingsRecordEdit.fillCallNumberValues({ callNumber: testData.callNumberValue });
        HoldingsRecordEdit.verifyCallNumberValues({ callNumber: testData.callNumberValue });
        HoldingsRecordEdit.pressEnterInCallNumberField();
        HoldingsRecordEdit.verifyCallNumberValues({ callNumber: `${testData.callNumberValue}\n` });
        cy.wait(2000); // make sure the pane remains opened
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.verifyCallNumberValues({ callNumber: `${testData.callNumberValue}\n` });
        InteractorsTools.checkNoSuccessCallouts();

        // Step 3b: another non-resizable textbox (Acquisition method) - saves on Enter,
        // form stays open
        HoldingsRecordEdit.fillAcquisitionMethod(testData.acquisitionMethodValue);
        HoldingsRecordEdit.verifyAcquisitionMethod(testData.acquisitionMethodValue);
        HoldingsRecordEdit.pressEnterInAcquisitionMethodField();
        HoldingsRecordEdit.verifyHoldingSavedCallout();
        InteractorsTools.closeAllVisibleCallouts();
        cy.wait(2000); // make sure the pane remains opened
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.verifyAcquisitionMethod(testData.acquisitionMethodValue);

        // Step 3c: another resizable textbox (Digitization policy) - doesn't save on Enter,
        // form stays open
        HoldingsRecordEdit.fillDigitizationPolicy(testData.digitizationPolicyValue);
        HoldingsRecordEdit.verifyDigitizationPolicy(testData.digitizationPolicyValue);
        HoldingsRecordEdit.pressEnterInDigitizationPolicyField();
        HoldingsRecordEdit.verifyDigitizationPolicy(`${testData.digitizationPolicyValue}\n`);
        cy.wait(2000); // make sure the pane remains opened
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.verifyDigitizationPolicy(`${testData.digitizationPolicyValue}\n`);
        InteractorsTools.checkNoSuccessCallouts();
      },
    );
  });
});
