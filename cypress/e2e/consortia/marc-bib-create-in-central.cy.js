import Permissions from '../../support/dictionary/permissions';
import Affiliations, { TENANT_NAMES } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC Bibliographic -> Create new MARC bib -> Consortia', () => {
  const testData = {
    sharedPaneheaderCreateText: 'Create a new shared MARC bib record',
    tag245: '245',
    tag700: '700',
    tagLDR: 'LDR',
    validLDRValue: '00000naa\\a2200000uu\\4500',
    instanceTitle: `C405547 Created Shared Instance ${getRandomPostfix()}`,
    tag700Content: '$a Dante Alighieri C422123 $d 1265-1321 $e Poet, Writer, Philosopher',
    constributorValue: 'Dante Alighieri C422123 1265-1321',
  };

  const tag245SourceMask = new RegExp(`\\$a ${testData.instanceTitle}`);
  const tag700SourceMask =
    /0 2\$a Dante Alighieri C422123 \$d 1265-1321 \$e Poet, Writer, Philosopher/;

  let createdInstanceID;

  before('Create users, data', () => {
    cy.getAdminToken();

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ])
      .then((userProperties) => {
        testData.userProperties = userProperties;
      })
      .then(() => {
        cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
        cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]);
      })
      .then(() => {
        cy.resetTenant();
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(createdInstanceID);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C422123 Create new Shared MARC bib in Central tenant (consortia)(spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.checkPaneheaderContains(testData.sharedPaneheaderCreateText);
      QuickMarcEditor.updateExistingField(testData.tagLDR, testData.validLDRValue);
      QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle}`);
      QuickMarcEditor.addEmptyFields(4);
      QuickMarcEditor.checkContent('$a ', 5);
      QuickMarcEditor.addValuesToExistingField(
        4,
        testData.tag700,
        testData.tag700Content,
        '0',
        '2',
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkDetailViewShared();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.checkExpectedMARCSource();
      InventoryInstance.verifyContributor(0, 1, testData.constributorValue);
      InventoryInstance.getId().then((id) => {
        createdInstanceID = id;
      });

      ConsortiumManager.switchActiveAffiliation(TENANT_NAMES.COLLEGE);
      InventoryInstances.waitContentLoading();

      InventoryInstance.searchByTitle(testData.instanceTitle);
      InventorySearchAndFilter.verifySharedIconForSearchResult(testData.instanceTitle);
      InventoryInstances.selectInstance();
      InventoryInstance.checkDetailViewShared();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.checkExpectedMARCSource();
      InventoryInstance.verifyContributor(0, 1, testData.constributorValue);
      InventoryInstance.viewSource();
      InventoryViewSource.checkSharedText();
      InventoryViewSource.checkFieldContentMatch(testData.tag245, tag245SourceMask);
      InventoryViewSource.checkFieldContentMatch(testData.tag700, tag700SourceMask);
    },
  );
});
