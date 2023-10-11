/* eslint-disable cypress/no-unnecessary-waiting */
import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import { TARGET_PROFILE_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user = null;
    const protectedFieldData = {
      protectedField: '*',
      in1: '*',
      in2: '*',
      subfield: '5',
      data: 'NcD',
      source: 'User',
    };
    const OCLCAuthentication = '100481406/PAOLF';
    const oclcForImport = '19257462';
    const initialFields = {
      first580field:
        '‡a Merged with: Journal of the Chemical Society. Perkin transactions I; Journal of the Chemical Society. Perkin transactions II; and Journal of the Chemical Society. Dalton transactions, to form: Perkin 1; Perkin 2; and Dalton (Cambridge, England).',
      first780field:
        '‡t Acta chemica Scandinavica. Series A, Physical and inorganic chemistry ‡x 0302-4377 ‡w (DLC)sn 79006037 ‡w (OCoLC)981847',
      second780field:
        '‡t Acta chemica Scandinavica. Series B, Organic chemistry and biochemistry ‡x 0302-4369 ‡w (DLC)sn 78006299 ‡w (OCoLC)981837',
      first785field:
        '‡t Journal of the Chemical Society. Perkin transactions I ‡x 0300-922X ‡w (DLC)  2006219014 ‡w (OCoLC)1033975',
      second785field:
        '‡t Journal of the Chemical Society. Perkin transactions II ‡x 0300-9580 ‡w (DLC)   72623335 ‡w (OCoLC)1064266',
      third785field:
        '‡t Journal of the Chemical Society. Dalton transactions ‡x 0300-9246 ‡w (DLC)   72624566 ‡w (OCoLC)1034240',
      fourth785field: '‡t Perkin 1 ‡x 1470-4358 ‡w (DLC)   00252538 ‡w (OCoLC)44000773',
      fifth785field: '‡t Perkin 2 ‡x 1470-1820 ‡w (DLC)   00214936 ‡w (OCoLC)44000837',
      sixth785field:
        '‡t Dalton (Cambridge, England) ‡x 1470-479X ‡w (DLC)   00252543 ‡w (OCoLC)44000666',
    };
    const fieldsForChanging = {
      first780Field:
        '$t Acta chemica Scandinavica. Series B, Organic chemistry and biochemistry $x 0302-4369 $w (DLC)sn 78006299 $w (OCoLC)981837',
      first785Field:
        '$t Journal of the Chemical Society. Perkin transactions II $x 0300-9580 $w (DLC)   72623335 $w (OCoLC)1064266',
      second785Field:
        '$t Journal of the Chemical Society. Dalton transactions $x 0300-9246 $w (DLC)   72624566 $w (OCoLC)1034240',
      third785Field: '$t Perkin 1 $x 1470-4358 $w (DLC)   00252538 $w (OCoLC)44000773',
      fourth785Field: '$t Perkin 2 $x 1470-1820 $w (DLC)   00214936 $w (OCoLC)44000837',
      fifth785Field:
        '$t Dalton (Cambridge, England) $x 1470-479X $w (DLC)   00252543 $w (OCoLC)44000666',
    };
    const changedFields = {
      first580field: 'Test ‡5 NcD',
      first780field:
        '‡t Acta chemica Scandinavica. Series B, Organic chemistry and biochemistry ‡x 0302-4369 ‡w (DLC)sn 78006299 ‡w (OCoLC)981837 ‡5 NcD',
      first785field:
        '‡t Journal of the Chemical Society. Perkin transactions II ‡x 0300-9580 ‡w (DLC)   72623335 ‡w (OCoLC)1064266 ‡5 NcD',
      third785field:
        '‡t Journal of the Chemical Society. Dalton transactions ‡x 0300-9246 ‡w (DLC)   72624566 ‡w (OCoLC)1034240 ‡5 NcD',
      fourth785field: '‡t Perkin 1 ‡x 1470-4358 ‡w (DLC)   00252538 ‡w (OCoLC)44000773 ‡5 NcD',
      fifth785field: '‡t Perkin 2 ‡x 1470-1820 ‡w (DLC)   00214936 ‡w (OCoLC)44000837 ‡5 NcD',
      sixth785field:
        '‡t Dalton (Cambridge, England) ‡x 1470-479X ‡w (DLC)   00252543 ‡w (OCoLC)44000666 ‡5 NcD',
    };

    before('login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.remoteStorageView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiCanLinkUnlinkAuthorityRecordsToBibRecords.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);

        Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
      });
    });

    after('delete test data', () => {
      MarcFieldProtection.getListViaApi({ query: 'data==NcD' }).then((response) => {
        MarcFieldProtection.deleteViaApi(response[0].id);
      });
      Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359189 Check that protected fields in incoming records are not deleted during import: Scenario 2 (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        cy.visit(SettingsMenu.marcFieldProtectionPath);
        MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
        MarcFieldProtection.create(protectedFieldData);
        MarcFieldProtection.verifyFieldProtectionIsCreated('NcD');

        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.openTargetProfile();
        Z3950TargetProfiles.editOclcWorldCat(
          OCLCAuthentication,
          TARGET_PROFILE_NAMES.OCLC_WORLDCAT,
        );
        Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(OCLCAuthentication);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.importWithOclc(oclcForImport);
        InstanceRecordView.verifyInstancePaneExists();
        cy.wait(2000);
        // check fields is presented in .mrc file
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.viewSource();
        Object.values(initialFields).forEach((field) => InventoryViewSource.contains(field));
        cy.intercept('GET', '/orders/titles?*').as('getOrdersTitles');
        InventoryViewSource.close();
        cy.wait('@getOrdersTitles');

        // edit the MARC bibliographic record
        InventoryInstance.editMarcBibliographicRecord();
        Object.values(fieldsForChanging).forEach((field) => InventoryEditMarcRecord.editField(field, `${field} $5 NcD`));
        InventoryEditMarcRecord.addField('580', 'Test $5 NcD');
        InventoryEditMarcRecord.saveAndClose();

        // overlay source bibliographic record
        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.singleOverlaySourceBibRecordModalIsPresented();
        InventoryInstance.overlayWithOclc(oclcForImport);
        InventoryInstance.checkCalloutMessage(
          `Record ${oclcForImport} updated. Results may take a few moments to become visible in Inventory`,
        );

        // need to wait because after the import the data in the instance is displayed for a long time
        // https://issues.folio.org/browse/MODCPCT-73
        cy.wait(10000);
        InstanceRecordView.viewSource();
        // check fields without NcD is presented in .mrc file
        Object.values(initialFields).forEach((field) => InventoryViewSource.contains(field));

        // check fields with NcD is presented in .mrc file
        Object.values(changedFields).forEach((field) => InventoryViewSource.contains(field));
      },
    );
  });
});
