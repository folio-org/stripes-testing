import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ViewTargetProfile from '../../../support/fragments/settings/inventory/integrations/viewTargetProfile';

import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryModals from '../../../support/fragments/inventory/inventoryModals';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';

describe('ui-inventory', () => {
  let user;
  let instanceHRID;
  let profileId;
  const fileName = `C375126 autotestFile.${getRandomPostfix()}.mrc`;
  const targetProfileName = `C375126 autotest profile${getRandomPostfix()}`;
  const targetProfile = {
    name: 'OCLC WorldCat',
    url: 'zcat.oclc.org/OLUCWorldCat',
    authentification: '100473910/PAOLF',
    externalId: '@attr 1=1211 $identifier',
    internalId: '999ff$i'
  };

  before('create test data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    cy.getAdminToken().then(()=>{
DataImport.uploadFileViaApi('oneMarcBib.mrc', fileName);
        JobProfiles.waitFileIsImported(fileName);
        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
          instanceHRID = initialInstanceHrId;
        });
         Z3950TargetProfiles.changeOclcWorldCatValueViaApi('100473910/PAOLF');
        Z3950TargetProfiles.createNewZ3950TargetProfileViaApi(targetProfileName)
          .then(initialId => { profileId = initialId; });
        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.openTargetProfile();
        ViewTargetProfile.verifyTargetProfileForm(
          targetProfile.name,
          targetProfile.url,
          targetProfile.authentification,
          targetProfile.externalId,
          targetProfile.internalId
        );
        Z3950TargetProfiles.openTargetProfile(targetProfileName);
        ViewTargetProfile.verifyTargetProfileForm(
          targetProfile.name,
          targetProfile.url,
          targetProfile.authentification,
          targetProfile.externalId,
          targetProfile.internalId
        );
        cy.logout();
    });

    cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.uiInventorySingleRecordImport.gui,
        permissions.settingsDataImportEnabled.gui
      ])
        .then(userProperties => {
          user = userProperties;
  
          cy.login(user.username, user.password,
            { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
        });
  });

  it('C375126 Verify the modal window for ISRI In inventory instance details menu for multiple target profiles (folijet)',
  { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {

  });
});
