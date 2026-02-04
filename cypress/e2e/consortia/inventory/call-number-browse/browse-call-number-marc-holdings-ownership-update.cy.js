import { ITEM_STATUS_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitle = `AT_C877098_FolioInstance_${randomPostfix}`;
      const callNumberPrefix = `AT_C877098_CallNumber_${randomPostfix}`;
      const heldbyAccordionName = 'Held by';
      const callNumbers = Array.from({ length: 3 }, (_, i) => `${callNumberPrefix}_${i}`);
      const testData = {
        instance: {},
        user: {},
        holdings: {},
      };
      const userPermissions = [
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.uiInventoryUpdateOwnership.gui,
      ];

      let loanTypeId;
      let materialTypeId;

      before('Create test data', () => {
        cy.then(() => {
          cy.resetTenant();
          cy.getAdminToken();
          [Affiliations.University, Affiliations.College, Affiliations.Consortia].forEach(
            (affiliation) => {
              cy.withinTenant(affiliation, () => {
                InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C877098');
              });
            },
          );
        })
          .then(() => {
            cy.resetTenant();
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
              {
                tag: '008',
                content: QuickMarcEditor.valid008ValuesInstance,
              },
              {
                tag: '245',
                content: `$a ${instanceTitle}`,
                indicators: ['1', '1'],
              },
            ]).then((instanceId) => {
              testData.instance.instanceId = instanceId;

              cy.getInstanceById(testData.instance.instanceId).then((instance) => {
                testData.instance.hrid = instance.hrid;
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              testData.holdings.location = res;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdings.sourceId = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeId = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeId = res.id;
            });
          })
          .then(() => {
            cy.createMarcHoldingsViaAPI(testData.instance.instanceId, [
              {
                content: testData.instance.hrid,
                tag: '004',
              },
              {
                content: QuickMarcEditor.defaultValid008HoldingsValues,
                tag: '008',
              },
              {
                content: `$b ${testData.holdings.location.code} $h ${callNumbers[2]}`,
                indicators: ['\\', '\\'],
                tag: '852',
              },
            ]).then((marcHoldingsId) => {
              testData.holdings.id = marcHoldingsId;

              cy.getHoldings({
                limit: 1,
                query: `"instanceId"="${testData.instance.instanceId}"`,
              }).then((holdings) => {
                testData.holdings.hrid = holdings[0].hrid;
              });
            });
          })
          .then(() => {
            callNumbers.forEach((callNumber, index) => {
              const itemData = {
                holdingsRecordId: testData.holdings.id,
                materialType: { id: materialTypeId },
                permanentLoanType: { id: loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              };
              if (index !== 2) {
                itemData.itemLevelCallNumber = callNumber;
              }
              InventoryItems.createItemViaApi(itemData);
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.University);
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              testData.holdings.locationUniversity = res;
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.createTempUser(userPermissions).then((userProperties) => {
              testData.user = userProperties;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions);
              cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);

              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions);
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
        [Affiliations.University, Affiliations.College, Affiliations.Consortia].forEach(
          (affiliation) => {
            cy.withinTenant(affiliation, () => {
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C877098');
            });
          },
        );
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C877098 Verify that call numbers are still browsable after "MARC holdings" ownership update (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C877098'] },
        () => {
          callNumbers.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber);
          });

          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstanceById(testData.instance.instanceId);
          InstanceRecordView.waitLoading();
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkHoldingRecordViewOpened();
          HoldingsRecordView.updateOwnership(
            tenantNames.university,
            'confirm',
            testData.holdings.hrid,
            tenantNames.college,
            testData.holdings.locationUniversity.name,
          );
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instance.instanceId, false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordionAbsent(Affiliations.College);
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.University);
          InstanceRecordView.expandMemberSubHoldings(tenantNames.university);

          cy.wait(60 * 1000); // per test case - "Wait 1 minute"
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
          callNumbers.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber);

            InventorySearchAndFilter.browseSearch(callNumber);
            BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          });
        },
      );
    });
  });
});
