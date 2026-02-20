import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import HoldingsRecordView from '../../../../../support/fragments/inventory/holdingsRecordView';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ItemRecordNew from '../../../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../../../support/fragments/inventory/search/browseCallNumber';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../../../support/constants';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Create MARC holdings', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          user: {},
          marcTitle: `AT_C784586_MarcBibInstance_${randomPostfix}`,
          tag035: '035',
          tag852: '852',
          callNumberValue: `AT_C784586_CallNunmber_${randomPostfix}`,
          tag035Value: '784586123123',
        };
        const userPermissions = {
          central: [Permissions.inventoryAll.gui],
          college: [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
          ],
          university: [
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
          ],
        };

        let createdInstanceId;
        let holdingsLocation;
        let loanTypeName;
        let materialTypeName;

        before('Create test data', () => {
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
          })
            .then(() => {
              [Affiliations.College, Affiliations.Consortium].forEach((tenant) => {
                cy.withinTenant(tenant, () => {
                  InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C784586');
                });
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
              }).then((res) => {
                holdingsLocation = res;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                loanTypeName = res[0].name;
              });
              cy.getBookMaterialType().then((res) => {
                materialTypeName = res.name;
              });
            })
            .then(() => {
              cy.createTempUser(userPermissions.college).then((userProperties) => {
                testData.user = userProperties;

                cy.resetTenant();
                cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions.central);
                cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);

                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(
                  testData.user.userId,
                  userPermissions.university,
                );
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.createSimpleMarcBibViaAPI(testData.marcTitle).then((instanceId) => {
                createdInstanceId = instanceId;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          [Affiliations.College, Affiliations.Consortium].forEach((tenant) => {
            cy.withinTenant(tenant, () => {
              InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcTitle);
            });
          });
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(testData.user.userId);
        });

        it(
          'C784586 Create MARC holdings record on Shared MARC bib from Member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C784586'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitInstanceRecordViewOpened();

            InventoryInstance.goToMarcHoldingRecordAdding();
            QuickMarcEditor.waitLoading();

            QuickMarcEditor.updateExistingField(
              testData.tag852,
              `$b ${holdingsLocation.code} $h ${testData.callNumberValue}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag852,
              `$b ${holdingsLocation.code} $h ${testData.callNumberValue}`,
            );

            QuickMarcEditor.addEmptyFields(4);
            QuickMarcEditor.checkEmptyFieldAdded(5);
            QuickMarcEditor.addValuesToExistingField(
              4,
              testData.tag035,
              `$a ${testData.tag035Value}`,
            );
            QuickMarcEditor.checkContentByTag(testData.tag035, `$a ${testData.tag035Value}`);

            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveHoldings();
            HoldingsRecordView.checkCallNumber(testData.callNumberValue);
            HoldingsRecordView.checkPermanentLocation(holdingsLocation.name);
            HoldingsRecordView.checkFormerHoldingsId(testData.tag035Value);

            HoldingsRecordView.close();
            InventoryInstance.waitInstanceRecordViewOpened();

            InventoryInstance.addItem();
            ItemRecordNew.fillItemRecordFields({
              materialType: materialTypeName,
              loanType: loanTypeName,
            });
            ItemRecordNew.saveAndClose();
            InventoryInstance.waitInstanceRecordViewOpened();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
            InventorySearchAndFilter.checkBrowseOptionSelected(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
            BrowseCallNumber.waitForCallNumberToAppear(testData.callNumberValue);
            InventorySearchAndFilter.browseSearch(testData.callNumberValue);
            BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumberValue);

            ConsortiumManager.switchActiveAffiliation(
              Affiliations.College,
              Affiliations.Consortium,
            );
            InventoryInstances.waitContentLoading();

            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.expandConsortiaHoldings();
            InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
            InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
            InstanceRecordView.verifyIsHoldingsCreated([holdingsLocation.name]);

            ConsortiumManager.switchActiveAffiliation(
              Affiliations.Consortium,
              Affiliations.University,
            );
            InventoryInstances.waitContentLoading();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
            InventorySearchAndFilter.checkBrowseOptionSelected(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
            cy.setTenant(Affiliations.University);
            BrowseCallNumber.waitForCallNumberToAppear(testData.callNumberValue);
            InventorySearchAndFilter.browseSearch(testData.callNumberValue);
            BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumberValue);

            BrowseCallNumber.selectInstanceByCallNumber(testData.callNumberValue);
            InventorySearchAndFilter.validateSearchTabIsDefault();
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.expandConsortiaHoldings();
            InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
            InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
            InstanceRecordView.verifyIsHoldingsCreated([holdingsLocation.name]);
          },
        );
      });
    });
  });
});
