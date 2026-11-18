import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../constants';
import Affiliations, { tenantNames } from '../../dictionary/affiliations';
import Permissions from '../../dictionary/permissions';
import ConsortiumManager from '../settings/consortium-manager/consortium-manager';
import SettingsInventory from '../settings/inventory/settingsInventory';
import VersionHistorySettings from '../settings/inventory/versionHistory';
import SettingsPane from '../settings/settingsPane';
import Locations from '../settings/tenant/location-setup/locations';
import TopMenu from '../topMenu';
import TopMenuNavigation from '../topMenuNavigation';
import InventoryHoldings from './holdings/inventoryHoldings';
import HoldingsRecordView from './holdingsRecordView';
import InstanceRecordView from './instanceRecordView';
import InventoryInstance from './inventoryInstance';
import InventoryInstances from './inventoryInstances';
import InventorySearchAndFilter from './inventorySearchAndFilter';
import InventoryViewSource from './inventoryViewSource';
import InventoryItems from './item/inventoryItems';
import ItemRecordView from './item/itemRecordView';
import VersionHistorySection from './versionHistorySection';

// Helpers shared by the C655282_* specs: "Cards to display per page on Version history"
// (Settings >> Inventory >> Version history) in a consortium.

const TOTAL_UPDATES = 26;
// creation + updates: more than 25, so "Load more" is always present with 10 and 25 cards per page
const TOTAL_VERSIONS = TOTAL_UPDATES + 1;
const DEFAULT_CARDS_PER_PAGE = 10;
const UPDATED_CARDS_PER_PAGE = 25;
const VERSION_HISTORY_TAB = 'Version history';

const permissions = [
  Permissions.uiInventoryViewInstances.gui,
  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
  Permissions.inventoryViewEditGeneralSettings.gui,
];

// Runs updateFn(iteration) one after another for iterations 1..TOTAL_UPDATES
const updateNTimes = (updateFn, iteration = 1) => {
  if (iteration > TOTAL_UPDATES) return cy.wrap(null);
  return updateFn(iteration).then(() => updateNTimes(updateFn, iteration + 1));
};

const openInstance = (instanceId) => {
  InventoryInstances.searchByTitle(instanceId);
  InventoryInstances.selectInstanceById(instanceId);
  InventoryInstance.waitLoading();
};

const verifyCardsDisplayed = (cardsCount) => {
  VersionHistorySection.waitLoading();
  VersionHistorySection.verifyVersionHistoryPane(cardsCount, true, TOTAL_VERSIONS);
};

const expandMemberHoldingsInCentral = (holdingId) => {
  InstanceRecordView.expandConsortiaHoldings();
  InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
  InstanceRecordView.verifyMemberSubSubHoldingsAccordion(
    tenantNames.college,
    Affiliations.College,
    holdingId,
  );
};

export default {
  permissions,
  cardsPerPage: {
    default: DEFAULT_CARDS_PER_PAGE,
    updated: UPDATED_CARDS_PER_PAGE,
  },

  // ---------- test data: updates (versions) ----------

  updateFolioInstanceNTimes(instanceId, prefix) {
    return updateNTimes((iteration) => {
      return cy.getInstanceById(instanceId).then((instance) => {
        return cy.updateInstance({ ...instance, indexTitle: `${prefix}_index_${iteration}` });
      });
    });
  },

  updateMarcInstanceNTimes(instanceId, title) {
    return updateNTimes((iteration) => {
      return cy.getMarcRecordDataViaAPI(instanceId).then((marcData) => {
        const field245 = marcData.fields.find((field) => field.tag === '245');
        field245.content = `$a ${title} v${iteration}`;
        marcData.relatedRecordVersion = iteration;
        return cy
          .updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData)
          .then(({ status }) => {
            expect(status).to.be.greaterThan(200);
          });
      });
    });
  },

  updateHoldingsNTimes(holdingId, prefix) {
    return updateNTimes((iteration) => {
      return cy.getHoldings({ limit: 1, query: `"id"=="${holdingId}"` }).then((holdings) => {
        return cy.updateHoldingRecord(holdingId, {
          ...holdings[0],
          copyNumber: `${prefix}_${iteration}`,
        });
      });
    });
  },

  updateItemNTimes(barcode, prefix) {
    return updateNTimes((iteration) => {
      return cy.getItems({ limit: 1, query: `"barcode"=="${barcode}"` }).then((item) => {
        return cy.updateItemViaApi({ ...item, copyNumber: `${prefix}_${iteration}` });
      });
    });
  },

  // ---------- test data: setup and cleanup ----------

  // Leftovers of previous runs are removed, "10" is set in Central and Member
  prepareEnvironment(prefix) {
    cy.resetTenant();
    cy.getAdminToken();
    // Member first: holdings and items of shared instances live there
    cy.setTenant(Affiliations.College);
    InventoryInstances.deleteFullInstancesByTitleViaApi(prefix);
    cy.resetTenant();
    InventoryInstances.deleteFullInstancesByTitleViaApi(prefix);
    this.resetCardsPerPageInBothTenants();
  },

  resetCardsPerPageInBothTenants() {
    cy.resetTenant();
    cy.getAdminToken();
    cy.setVersionHistoryRecordsPerPage(DEFAULT_CARDS_PER_PAGE);
    cy.setTenant(Affiliations.College);
    cy.setVersionHistoryRecordsPerPage(DEFAULT_CARDS_PER_PAGE);
    cy.resetTenant();
  },

  // Location, loan type and material type of Member, saved into testData
  getMemberReferenceData(testData) {
    cy.setTenant(Affiliations.College);
    Locations.getOrCreateTenantLocationViaApi(Affiliations.College).then((location) => {
      testData.location = location;
    });
    cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
      testData.loanTypeId = loanTypes[0].id;
    });
    cy.getMaterialTypes({ limit: 1, query: 'name=="book"' }).then((materialType) => {
      testData.materialTypeId = materialType.id;
    });
    cy.resetTenant();
  },

  // Holdings (and the item, if barcode is passed) are always created in Member,
  // even if the instance is shared. Created ids are saved into testData.holdingId/itemId
  createMemberHoldingWithItem(instanceId, testData, barcode) {
    cy.setTenant(Affiliations.College);
    InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
      InventoryHoldings.createHoldingRecordViaApi({
        instanceId,
        permanentLocationId: testData.location.id,
        sourceId: folioSource.id,
      }).then((holding) => {
        testData.holdingId = holding.id;
        if (barcode) {
          InventoryItems.createItemViaApi({
            barcode,
            holdingsRecordId: holding.id,
            materialType: { id: testData.materialTypeId },
            permanentLoanType: { id: testData.loanTypeId },
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
          }).then((item) => {
            testData.itemId = item.id;
          });
        }
      });
    });
    cy.resetTenant();
  },

  deleteMemberHoldingWithItem(testData) {
    cy.setTenant(Affiliations.College);
    if (testData.itemId) InventoryItems.deleteItemViaApi(testData.itemId);
    if (testData.holdingId) InventoryHoldings.deleteHoldingRecordViaApi(testData.holdingId);
    cy.resetTenant();
  },

  // User with the same permissions in Central and Member, logged in on Central "Settings"
  createUserAndLogin(testData) {
    cy.resetTenant();
    cy.getAdminToken();
    cy.createTempUser(permissions).then((userProperties) => {
      testData.user = userProperties;
      cy.affiliateUserToTenant({
        tenantId: Affiliations.College,
        userId: userProperties.userId,
        permissions,
      });
      cy.resetTenant();
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });
  },

  // ---------- steps ----------

  // Steps 1-2: change the value on Central and save
  changeCentralCardsPerPage(value = UPDATED_CARDS_PER_PAGE) {
    ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
    SettingsInventory.goToSettingsInventory();
    SettingsInventory.selectSettingsTab(VERSION_HISTORY_TAB);
    VersionHistorySettings.waitLoading();
    VersionHistorySettings.verifyCardsPerPageValue(DEFAULT_CARDS_PER_PAGE);
    VersionHistorySettings.selectCardsPerPageAndSave(value);
  },

  openInventoryInCentral() {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
    InventoryInstances.waitContentLoading();
  },

  switchToMemberInventory() {
    ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
    ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
    InventoryInstances.waitContentLoading();
    InventorySearchAndFilter.clearDefaultHeldbyFilter();
  },

  // ---------- checks: Instance (active tenant: Central or Member) ----------

  checkFolioInstanceVersionHistory(instanceId, cardsCount) {
    openInstance(instanceId);
    InstanceRecordView.clickVersionHistoryButton();
    verifyCardsDisplayed(cardsCount);
    VersionHistorySection.clickCloseButton();
  },

  checkMarcInstanceVersionHistory(instanceId, cardsCount) {
    openInstance(instanceId);
    InventoryInstance.viewSource();
    InventoryViewSource.verifyVersionHistoryButtonShown();
    InventoryViewSource.clickVersionHistoryButton();
    verifyCardsDisplayed(cardsCount);
    VersionHistorySection.clickCloseButton();
    InventoryViewSource.close();
    InventoryInstance.waitLoading();
  },

  // ---------- checks: Holdings and Item opened from Central (Consortial holdings accordion) ----------

  checkHoldingsVersionHistoryFromCentral(instanceId, holdingId) {
    openInstance(instanceId);
    expandMemberHoldingsInCentral(holdingId);
    InstanceRecordView.openHoldingView();
    ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
    HoldingsRecordView.waitLoading();
    HoldingsRecordView.clickVersionHistoryButton();
    verifyCardsDisplayed(DEFAULT_CARDS_PER_PAGE);
    VersionHistorySection.clickCloseButton();
    HoldingsRecordView.close();
    ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
  },

  checkItemVersionHistoryFromCentral({ instanceId, holdingId, locationName, barcode }) {
    openInstance(instanceId);
    expandMemberHoldingsInCentral(holdingId);
    InstanceRecordView.expandHoldings(locationName);
    InstanceRecordView.openItemByHyperlink(barcode);
    ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
    ItemRecordView.clickVersionHistoryButton();
    verifyCardsDisplayed(DEFAULT_CARDS_PER_PAGE);
    VersionHistorySection.clickCloseButton();
    ItemRecordView.closeDetailView();
    InventoryInstance.waitLoading();
    ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
  },

  // ---------- checks: Holdings and Item opened from Member ----------

  checkHoldingsVersionHistoryInMember(instanceId) {
    openInstance(instanceId);
    InventoryInstance.openHoldingView();
    HoldingsRecordView.clickVersionHistoryButton();
    verifyCardsDisplayed(DEFAULT_CARDS_PER_PAGE);
    VersionHistorySection.clickCloseButton();
    HoldingsRecordView.close();
  },

  checkItemVersionHistoryInMember({ instanceId, locationName, barcode }) {
    openInstance(instanceId);
    InventoryInstance.openHoldingsAccordion(locationName);
    InventoryInstance.openItemByBarcode(barcode);
    ItemRecordView.clickVersionHistoryButton();
    verifyCardsDisplayed(DEFAULT_CARDS_PER_PAGE);
    VersionHistorySection.clickCloseButton();
    ItemRecordView.closeDetailView();
    InventoryInstance.waitLoading();
  },
};
