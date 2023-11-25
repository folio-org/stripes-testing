import { DevTeams, TestTypes, Permissions, Parallelization } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import InventoryKeyboardShortcuts from '../../support/fragments/inventory/inventoryKeyboardShortcuts';
import InventoryHotkeys from '../../support/fragments/inventory/inventoryHotkeys';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';

describe('MARC › MARC Bibliographic › Edit MARC bib', () => {
  const testData = {};
  const createdAuthorityIDs = [];

  cy.createTempUser([
    Permissions.inventoryAll.gui,
    Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
    Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
  ]).then((userProperties) => {
    testData.user = userProperties;

    cy.login(testData.user.username, testData.user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    }).then(() => {
      InventoryInstances.waitContentLoading();
      InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
    });
  });

  after('Deleting test user and an inventory instance', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
    });
  });

  it(
    'C375176 Error notifications shown before confirmation modals when saving "MARC bib" record while editing record (Spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {},
  );
});
