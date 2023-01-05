import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/z39.50TargetProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('ui-data-import: Check that protected fields in incoming records are not deleted during import: Scenario 2', () => {
  let user = null;
  const authentication = '100473910/PAOLF';
  const oclcForImport = '19257462';
  const fields = {
    field580: 'Test ‡5 NcD',
    field5801: '‡a Merged with: Journal of the Chemical Society. Perkin transactions I; Journal of the Chemical Society. Perkin transactions II; and Journal of the Chemical Society. Dalton transactions, to form: Perkin 1; Perkin 2; and Dalton (Cambridge, England).',
    field780: '‡t Acta chemica Scandinavica. Series A, Physical and inorganic chemistry ‡x 0302-4377 ‡w (DLC)sn 79006037 ‡w (OCoLC)981847',
    field7801: '‡t Acta chemica Scandinavica. Series B, Organic chemistry and biochemistry ‡x 0302-4369 ‡w (DLC)sn 78006299 ‡w (OCoLC)981837',
    field7851: '‡t Journal of the Chemical Society. Perkin transactions I ‡x 0300-922X ‡w (DLC)  2006219014 ‡w (OCoLC)1033975',
    field7852: '‡t Journal of the Chemical Society. Perkin transactions II ‡x 0300-9580 ‡w (DLC)   72623335 ‡w (OCoLC)1064266',
    field7853: '‡t Journal of the Chemical Society. Dalton transactions ‡x 0300-9246 ‡w (DLC)   72624566 ‡w (OCoLC)1034240',
    field7854: '‡t Perkin 1 ‡x 1470-4358 ‡w (DLC)   00252538 ‡w (OCoLC)44000773',
    field7855: '‡t Perkin 2 ‡x 1470-1820 ‡w (DLC)   00214936 ‡w (OCoLC)44000837',
    field7856: '‡t Dalton (Cambridge, England) ‡x 1470-479X ‡w (DLC)   00252543 ‡w (OCoLC)44000666'
  };

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.remoteStorageView.gui,
      permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      permissions.uiCanLinkUnlinkAuthorityRecordsToBibRecords.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password);

        Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
      });
  });

  // after(() => {
  //   MarcFieldProtection.getListOfMarcFieldProtectionViaApi({ query: '"field"=="*"' })
  //     .then(list => {
  //       list.forEach(({ id }) => MarcFieldProtection.deleteMarcFieldProtectionViaApi(id));
  //     });
  //   Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
  //   Users.deleteViaApi(user.userId);
  // });

  it('C359189 Check that protected fields in incoming records are not deleted during import: Scenario 2 (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    cy.visit(SettingsMenu.marcFieldProtectionPath);
    MarcFieldProtection.currentListOfProtectedMarcFieldsIsPresented();
    MarcFieldProtection.createNewMarcFieldProtection();
    MarcFieldProtection.fillMarcFieldProtection('*', '5', 'NcD');
    MarcFieldProtection.checkFieldProtectionIsCreated('NcD');

    cy.visit(SettingsMenu.targetProfilesPath);
    Z3950TargetProfiles.openOclcWorldCat();
    Z3950TargetProfiles.editOclcWorldCat(authentication);
    Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(authentication);

    cy.visit(TopMenu.inventoryPath);
    InventoryInstances.importWithOclc(oclcForImport);
    // check fields is presented in .mrc file
    InventoryInstance.viewSource();
    InventoryViewSource.contains(fields.field5801);
    InventoryViewSource.contains(fields.field780);
    InventoryViewSource.contains(fields.field7801);
    InventoryViewSource.contains(fields.field7851);
    InventoryViewSource.contains(fields.field7852);
    InventoryViewSource.contains(fields.field7853);
    InventoryViewSource.contains(fields.field7854);
    InventoryViewSource.contains(fields.field7855);
    InventoryViewSource.contains(fields.field7856);
    cy.intercept('GET', '/orders/titles?*').as('getOrdersTitles');
    InventoryViewSource.close();
    cy.wait('@getOrdersTitles');

    // edit the MARC bibliographic record
    InventoryInstance.editMarcBibliographicRecord();
    InventoryEditMarcRecord.editField(`${fields.field780} ‡5 NcD`, 62);
    InventoryEditMarcRecord.editField(`${fields.field7851} ‡5 NcD`, 64);
    InventoryEditMarcRecord.editField(`${fields.field7852} ‡5 NcD`, 65);
    InventoryEditMarcRecord.editField(`${fields.field7853} ‡5 NcD`, 66);
    InventoryEditMarcRecord.editField(`${fields.field7854} ‡5 NcD`, 67);
    InventoryEditMarcRecord.editField(`${fields.field7855} ‡5 NcD`, 68);
    InventoryEditMarcRecord.addField('580', fields.field580);
    InventoryEditMarcRecord.saveAndClose();

    // overlay source bibliographic record
    InventoryInstance.startOverlaySourceBibRecord();
    InventoryInstance.singleRecordImportModalIsPresented();
    InventoryInstance.importWithOclc(oclcForImport);
    InventoryInstance.checkCalloutMessage(`Updated record ${oclcForImport}`);

    // check fields with NcD is presented in .mrc file
    InventoryInstance.viewSource();
    InventoryViewSource.contains(fields.field580);
    InventoryViewSource.contains(`${fields.field780} ‡5 NcD`);
    InventoryViewSource.contains(`${fields.field7851} ‡5 NcD`);
    InventoryViewSource.contains(`${fields.field7852} ‡5 NcD`);
    InventoryViewSource.contains(`${fields.field7853} ‡5 NcD`);
    InventoryViewSource.contains(`${fields.field7854} ‡5 NcD`);
    InventoryViewSource.contains(`${fields.field7855} ‡5 NcD`);

    // check fields without NcD is presented in .mrc file
    InventoryViewSource.contains(fields.field5801);
    InventoryViewSource.contains(fields.field780);
    InventoryViewSource.contains(fields.field7801);
    InventoryViewSource.contains(fields.field7851);
    InventoryViewSource.contains(fields.field7852);
    InventoryViewSource.contains(fields.field7853);
    InventoryViewSource.contains(fields.field7854);
    InventoryViewSource.contains(fields.field7855);
    InventoryViewSource.contains(fields.field7856);
  });
});
